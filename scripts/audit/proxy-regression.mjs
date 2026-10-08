import assert from 'node:assert/strict';
import { createApiProxy } from '../../src/lib/server/apiProxy.mjs';

for (const routePrefix of ['/api/proxy/', '/api/proxy2/']) {
  for (const location of ['https://outside.example/leak', '/api/test/']) {
    const calls = [];
    const fetchImpl = async (url, options) => {
      calls.push({ url: String(url), options });
      return calls.length === 1
        ? new Response(null, { status: 307, headers: { location } })
        : new Response('{"ok":true}', { status: 200 });
    };
    const { GET } = createApiProxy({
      apiUrl: 'https://backend.example', routePrefix, fetchImpl, label: 'test',
    });
    const response = await GET(new Request(`https://portal.example${routePrefix}test`, {
      headers: { cookie: 'synthetic=session' },
    }));
    assert.ok(calls[0].options.signal instanceof AbortSignal);
    if (location.startsWith('https://outside')) {
      assert.equal(response.status, 502);
      assert.equal(calls.length, 1);
    } else {
      assert.equal(response.status, 200);
      assert.equal(calls.length, 2);
      assert.equal(calls[1].options.headers.get('Cookie'), 'synthetic=session');
      assert.equal(calls[1].options.redirect, 'manual');
    }
  }
}
console.log('4 proxy regression scenarios passed');
