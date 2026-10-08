import { createApiProxy } from '@/lib/server/apiProxy.mjs';

const handlers = createApiProxy({
  apiUrl: process.env.FASTAPI_URL || 'http://localhost:8000',
  routePrefix: '/api/proxy/',
  label: 'proxy',
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
