/**
 * API Proxy to FastAPI backend
 * This solves cross-origin cookie issues by proxying requests through Next.js
 */
import { NextResponse } from 'next/server';

const API_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

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
  // Preserve original URL path (incl. trailing slash) and query string.
  // Using params.path.join('/') strips the trailing slash, which causes FastAPI
  // to 307-redirect and Node fetch re-issues the request without the Cookie header → 401.
  const originalUrl = new URL(request.url);
  const backendPath = originalUrl.pathname.replace(/^\/api\/proxy\//, '');
  const url = `${API_URL}/api/${backendPath}${originalUrl.search}`;
  
  const headers = new Headers();

  const contentType = request.headers.get('content-type') || '';

  // Forward cookies from the request
  const cookie = request.headers.get('cookie');
  if (cookie) headers.set('Cookie', cookie);

  const options = { method, headers };

  if (method !== 'GET' && method !== 'HEAD') {
    try {
      if (contentType.includes('multipart/form-data')) {
        // Parse the multipart body and pass FormData directly to fetch.
        // fetch() will encode it with a fresh boundary and set Content-Type automatically.
        // Do NOT set Content-Type manually here — that would break the boundary.
        const formData = await request.formData();
        options.body = formData;
      } else {
        // JSON and other text-based bodies
        if (contentType) headers.set('Content-Type', contentType);
        const body = await request.text();
        if (body) options.body = body;
      }
    } catch (e) {
      // No body
    }
  }
  
  try {
    // Use redirect: 'manual' so we can re-issue with Cookie on FastAPI 307 redirects.
    // Node.js fetch silently drops the Cookie header when auto-following redirects,
    // which causes the backend to return 401 on protected endpoints.
    const hasCookie = !!headers.get('Cookie');
    console.log(`[proxy] ${method} ${url} | cookie=${hasCookie ? 'present' : 'MISSING'}`);

    let response = await fetch(url, { ...options, redirect: 'manual' });
    console.log(`[proxy] initial status=${response.status}`);

    // Manually follow 307/308 redirects while preserving all headers (esp. Cookie).
    // Railway terminates TLS in front of FastAPI, so Starlette may emit an http:// Location
    // header. We force https:// to avoid a second implicit http→https hop that drops Cookie.
    if ((response.status === 307 || response.status === 308) && response.headers.get('location')) {
      const rawRedirect = response.headers.get('location');
      // Force HTTPS only for non-localhost — Railway emits http:// Location headers but localhost has no TLS
      const isLocal = rawRedirect.includes('localhost') || rawRedirect.includes('127.0.0.1');
      const redirectUrl = isLocal ? rawRedirect : rawRedirect.replace(/^http:\/\//, 'https://');
      const cookieVal = headers.get('Cookie');
      const contentTypeVal = headers.get('Content-Type');
      const redirectHeaders = new Headers();
      if (cookieVal) redirectHeaders.set('Cookie', cookieVal);
      if (contentTypeVal) redirectHeaders.set('Content-Type', contentTypeVal);
      console.log(`[proxy] following redirect to ${redirectUrl} | cookie=${cookieVal ? 'present' : 'MISSING'}`);
      // Use redirect:'manual' again so any further redirect also preserves Cookie.
      // Pass options.body so POST/PATCH/PUT bodies survive the redirect.
      response = await fetch(redirectUrl, { method, headers: redirectHeaders, body: options.body, redirect: 'manual' });
      console.log(`[proxy] redirect status=${response.status}`);
      // Handle one more level of redirect (e.g. http->https became another 307/308)
      if ((response.status === 307 || response.status === 308) && response.headers.get('location')) {
        const finalUrl = response.headers.get('location').replace(/^http:\/\//, 'https://');
        const finalHeaders = new Headers();
        if (cookieVal) finalHeaders.set('Cookie', cookieVal);
        if (contentTypeVal) finalHeaders.set('Content-Type', contentTypeVal);
        console.log(`[proxy] second redirect to ${finalUrl}`);
        response = await fetch(finalUrl, { method, headers: finalHeaders, body: options.body });
        console.log(`[proxy] final status=${response.status}`);
      }
    }

    // Get response body
    const data = await response.text();
    
    // Build response using NextResponse for reliable header handling
    const proxyResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': response.headers.get('content-type') || 'application/json' },
    });
    
    // Forward all Set-Cookie headers from backend (handles multiple cookies)
    const setCookies = response.headers.getSetCookie
      ? response.headers.getSetCookie()
      : [response.headers.get('set-cookie')].filter(Boolean);
    for (const cookie of setCookies) {
      proxyResponse.headers.append('Set-Cookie', cookie);
    }
    
    return proxyResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: 'Proxy error' }, { status: 502 });
  }
}
