import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fetchAsset } from '../../scripts/fetch-asset.mjs';

test('optional asset timeout covers a stalled response body', async t => {
  const server = http.createServer((_req, res) => { res.writeHead(200); res.write('partial'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/audio`;
  await assert.rejects(fetchAsset(url, {timeoutMs:100}), error=>['AbortError','TimeoutError'].includes(error.name));
});
