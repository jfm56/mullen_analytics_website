/**
 * Second API proxy — routes to the ON-PREM FastAPI instance (visitor analytics
 * + lead discovery), so that data lands on Jim's own hardware instead of the
 * Railway backend. Everything else keeps using /api/proxy (→ FASTAPI_URL).
 *
 * ONPREM_FASTAPI_URL should point at the on-prem backend (e.g. a Cloudflare
 * Tunnel hostname). If it's unset, this falls back to FASTAPI_URL so local dev
 * (one backend) and pre-on-prem prod behave exactly like /api/proxy.
 *
 * Otherwise identical to /api/proxy — same cookie-preserving manual redirect
 * handling (Railway/tunnel TLS quirk).
 */
import { NextResponse } from 'next/server';

const API_URL = process.env.ONPREM_FASTAPI_URL || process.env.FASTAPI_URL || 'http://localhost:8000';

export async function GET(request, { params }) {
  const path = (await params).path.join('/');
  return proxyRequest(request, path, 'GET');
}

export async function POST(request, { params }) {
  const path = (await params).path.join('/');
  return proxyRequest(request, path, 'POST');
}

export async function PATCH(request, { params }) {
  const path = (await params).path.join('/');
  return proxyRequest(request, path, 'PATCH');
}

export async function PUT(request, { params }) {
  const path = (await params).path.join('/');
  return proxyRequest(request, path, 'PUT');
}

export async function DELETE(request, { params }) {
  const path = (await params).path.join('/');
  return proxyRequest(request, path, 'DELETE');
}

async function proxyRequest(request, path, method) {
  // Preserve original URL path (incl. trailing slash) + query string, so FastAPI
  // does not 307-redirect and drop the Cookie header.
  const originalUrl = new URL(request.url);
  const backendPath = originalUrl.pathname.replace(/^\/api\/proxy2\//, '');
  const url = `${API_URL}/api/${backendPath}${originalUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get('content-type') || '';

  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('Cookie', cookie);

  const options = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    try {
      if (contentType.includes('multipart/form-data')) {
        options.body = await request.formData();
      } else {
        if (contentType) headers.set('Content-Type', contentType);
        const body = await request.text();
        if (body) options.body = body;
      }
    } catch {
      // No body
    }
  }

  try {
    let response = await fetch(url, { ...options, redirect: 'manual' });

    if ((response.status === 307 || response.status === 308) && response.headers.get('location')) {
      const rawRedirect = response.headers.get('location');
      const isLocal = rawRedirect.includes('localhost') || rawRedirect.includes('127.0.0.1');
      const redirectUrl = isLocal ? rawRedirect : rawRedirect.replace(/^http:\/\//, 'https://');
      const cookieVal = headers.get('Cookie');
      const contentTypeVal = headers.get('Content-Type');
      const redirectHeaders = new Headers();
      if (cookieVal) redirectHeaders.set('Cookie', cookieVal);
      if (contentTypeVal) redirectHeaders.set('Content-Type', contentTypeVal);
      response = await fetch(redirectUrl, { method, headers: redirectHeaders, body: options.body, redirect: 'manual' });
      if ((response.status === 307 || response.status === 308) && response.headers.get('location')) {
        const finalUrl = response.headers.get('location').replace(/^http:\/\//, 'https://');
        const finalHeaders = new Headers();
        if (cookieVal) finalHeaders.set('Cookie', cookieVal);
        if (contentTypeVal) finalHeaders.set('Content-Type', contentTypeVal);
        response = await fetch(finalUrl, { method, headers: finalHeaders, body: options.body });
      }
    }

    const data = await response.text();
    const proxyResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });

    const setCookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);
    for (const c of setCookies) {
      proxyResponse.headers.append('Set-Cookie', c);
    }

    return proxyResponse;
  } catch (error) {
    console.error('Proxy2 error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
