/**
 * API Proxy to FastAPI backend
 * This solves cross-origin cookie issues by proxying requests through Next.js
 */

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
  const url = `${API_URL}/api/${path}`;
  
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
    const response = await fetch(url, options);
    
    // Get response body
    const data = await response.text();
    
    // Create response with same status
    const proxyResponse = new Response(data, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Forward Set-Cookie headers from backend
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      proxyResponse.headers.set('Set-Cookie', setCookie);
    }
    
    return proxyResponse;
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: 'Proxy error' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
