export async function fetchAsset(url, { timeoutMs = 20000, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(url, {
    headers: { 'user-agent':'GeoGeek-Pages-Build/1.0', accept:'audio/mpeg,*/*;q=0.8' },
    signal:AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}
