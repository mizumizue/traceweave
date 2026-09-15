import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { spawn, type ChildProcess } from 'node:child_process';
import { PortManager } from '../../src/infrastructure/system/PortManager.js';

async function waitFor(condition: () => Promise<boolean>, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Timed out waiting for condition');
}

function spawnPortHolder(port: number): ChildProcess {
  return spawn(
    process.execPath,
    ['-e', `require('http').createServer((_,r)=>r.end('hold')).listen(${port})`],
    { stdio: 'ignore' }
  );
}

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

/**
 * 【テスト概要】
 * - 対象: PortManager.reclaimPort
 * - 条件: 別プロセスが指定ポートを LISTEN 専有している状態
 * - 期待結果: 先行プロセスが終了され、ポートが解放されて reclaim が成功すること
 * - 関連文書: TC-0033, REQ-0005, SPEC-0004
 */
test('TC-0033: PortManager - 専有中ポートの先行プロセスを終了してポートを解放できること', async () => {
  const port = 39872;
  assert.equal(await PortManager.isPortAvailable(port), true);

  const holder = spawnPortHolder(port);
  try {
    await waitFor(async () => !(await PortManager.isPortAvailable(port)), 5000);

    const pidsBefore = PortManager.findListeningPids(port);
    assert.ok(pidsBefore.length > 0, 'Expected a listening PID before reclaim');

    const { reclaimed, killedPids } = await PortManager.reclaimPort(port);
    assert.equal(reclaimed, true);
    assert.ok(killedPids.length > 0);
    assert.equal(await PortManager.isPortAvailable(port), true);

    await waitFor(async () => holder.exitCode !== null, 5000);
  } finally {
    if (holder.exitCode === null) {
      holder.kill();
    }
  }
});
