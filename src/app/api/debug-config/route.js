export async function GET() {
  const apiUrl = process.env.FASTAPI_URL || 'NOT SET - using localhost:8000';
  let reachable = false;
  try {
    const res = await fetch(`${process.env.FASTAPI_URL || 'http://localhost:8000'}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
  return Response.json({ FASTAPI_URL: apiUrl, backend_reachable: reachable });
}
