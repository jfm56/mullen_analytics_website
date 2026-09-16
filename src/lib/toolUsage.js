// Records a public-tool calculation (inputs + results) so the owner can see how
// the tools are used and improve them. Anonymous — a random client id groups a
// visitor's repeat uses, and no name/email is attached unless they message us.
// Fire-and-forget: it must never block or break the tool.
export function logToolUsage(tool, inputs, results) {
  if (typeof window === 'undefined') return;
  try {
    let anonId = null;
    try {
      anonId = localStorage.getItem('ma_tool_anon');
      if (!anonId) {
        anonId = (window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
        localStorage.setItem('ma_tool_anon', anonId);
      }
    } catch { /* private mode / storage blocked — proceed without an id */ }

    fetch('/api/proxy/tools/usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool,
        inputs,
        results,
        anon_id: anonId,
        referrer: document.referrer || null,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* never let telemetry break the tool */ }
}
