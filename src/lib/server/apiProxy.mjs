import { NextResponse } from 'next/server.js';

const REDIRECT_STATUSES = new Set([307, 308]);
const METHODS_WITHOUT_BODY = new Set(['GET', 'HEAD']);

function sameUpstreamHost(target, upstream) {
  return target.hostname === upstream.hostname && target.port === upstream.port;
}

function safeRedirect(location, currentUrl, upstreamUrl) {
  const target = new URL(location, currentUrl);
  const local = target.hostname === 'localhost' || target.hostname === '127.0.0.1';
  if (!local && target.protocol === 'http:') target.protocol = 'https:';
  if (!sameUpstreamHost(target, upstreamUrl)) {
    throw new Error('Upstream redirect outside configured backend host');
  }
  return target;
}

async function requestBody(request, method, headers) {
  if (METHODS_WITHOUT_BODY.has(method)) return undefined;
  const contentType = request.headers.get('content-type') || '';
  try {
    if (contentType.includes('multipart/form-data')) return await request.formData();
    if (contentType) headers.set('Content-Type', contentType);
    const body = await request.text();
    return body || undefined;
  } catch {
    return undefined;
  }
}

function redirectHeaders(headers) {
  const result = new Headers();
  for (const name of ['Cookie', 'Content-Type']) {
    const value = headers.get(name);
    if (value) result.set(name, value);
  }
  return result;
}

function copySetCookies(upstream, downstream) {
  const cookies = upstream.headers.getSetCookie
    ? upstream.headers.getSetCookie()
    : [upstream.headers.get('set-cookie')].filter(Boolean);
  for (const cookie of cookies) downstream.headers.append('Set-Cookie', cookie);
}

export function createApiProxy({
  apiUrl,
  routePrefix,
  label = 'proxy',
  timeoutMs = 60000,
  maxRedirects = 2,
  fetchImpl = fetch,
}) {
  if (!apiUrl) throw new Error(`${label}: apiUrl is required`);
  if (!routePrefix?.startsWith('/') || !routePrefix.endsWith('/')) {
    throw new Error(`${label}: routePrefix must start and end with /`);
  }
  const upstreamUrl = new URL(apiUrl);

  const handle = (method) => async (request) => {
    const incomingUrl = new URL(request.url);
    if (!incomingUrl.pathname.startsWith(routePrefix)) {
      return NextResponse.json({ error: 'Invalid proxy path' }, { status: 400 });
    }
    const backendPath = incomingUrl.pathname.slice(routePrefix.length);
    const url = new URL(`/api/${backendPath}${incomingUrl.search}`, upstreamUrl);
    const headers = new Headers();
    const cookie = request.headers.get('cookie');
    if (cookie) headers.set('Cookie', cookie);
    const body = await requestBody(request, method, headers);
    const signal = AbortSignal.timeout(timeoutMs);

    try {
      let currentUrl = url;
      let response = await fetchImpl(currentUrl, {
        method, headers, body, signal, redirect: 'manual',
      });

      for (let count = 0; count < maxRedirects; count += 1) {
        const location = response.headers.get('location');
        if (!REDIRECT_STATUSES.has(response.status) || !location) break;
        currentUrl = safeRedirect(location, currentUrl, upstreamUrl);
        response = await fetchImpl(currentUrl, {
          method,
          headers: redirectHeaders(headers),
          body,
          signal,
          redirect: 'manual',
        });
      }

      const downstream = new NextResponse(await response.text(), {
        status: response.status,
        statusText: response.statusText,
        headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
      });
      copySetCookies(response, downstream);
      return downstream;
    } catch (error) {
      console.error(`${label} error:`, error);
      return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
    }
  };

  return Object.fromEntries(
    ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].map((method) => [method, handle(method)]),
  );
}
