import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { PortManager } from '../../src/infrastructure/system/PortManager.js';

/**
 * 【テスト概要】
 * - 対象: PortManager.isPortAvailable
 * - 条件: 任意の空きポートおよび一時的に専有したポートに対して判定を実行
 * - 期待結果: 空きポートでは true、専有中ポートでは false が返されること
 * - 関連文書: TC-0033, REQ-0005, SPEC-0004
 */
test('TC-0033: PortManager - 空きポートおよび専有中ポートの利用可否を正確に判定できること', async () => {
  const port = 39871;
  const initiallyFree = await PortManager.isPortAvailable(port);
  assert.equal(initiallyFree, true, `Port ${port} should initially be free`);

  const server = net.createServer();
  await new Promise<void>(resolve => server.listen(port, () => resolve()));

  try {
    const occupied = await PortManager.isPortAvailable(port);
    assert.equal(occupied, false, `Port ${port} should be occupied while listening`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }

  const freeAgain = await PortManager.isPortAvailable(port);
  assert.equal(freeAgain, true, `Port ${port} should be free after closing`);
});
