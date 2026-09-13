import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
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
  await new Promise<void>((resolve) => server.listen(port, () => resolve()));

  try {
    const occupied = await PortManager.isPortAvailable(port);
    assert.equal(occupied, false, `Port ${port} should be occupied while listening`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  const freeAgain = await PortManager.isPortAvailable(port);
  assert.equal(freeAgain, true, `Port ${port} should be free after closing`);
});

/**
 * 【テスト概要】
 * - 対象: PortManager.ensurePortFree
 * - 条件: 子プロセスでダミーのHTTPサーバーを起動してポートを専有させた状態で ensurePortFree を実行
 * - 期待結果: 先行プロセスのPIDが特定・強制終了され、ポートが解放されて再利用可能になること
 * - 関連文書: TC-0033, REQ-0005, SPEC-0004
 */
test('TC-0033: PortManager - 先行プロセスが専有するポートを強制終了して解放し、再起動可能にできること', async () => {
  const port = 39872;

  const dummyServerCode = `
    const http = require('http');
    const server = http.createServer((req, res) => res.end('ok'));
    server.listen(${port}, () => {
      console.log('READY');
    });
  `;

  const child = spawn(process.execPath, ['-e', dummyServerCode], {
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Dummy server startup timeout')), 5000);
      child.stdout.on('data', (data) => {
        if (data.toString().includes('READY')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });

    const occupied = await PortManager.isPortAvailable(port);
    assert.equal(occupied, false, 'Dummy server should occupy the port');

    const result = await PortManager.ensurePortFree(port);
    assert.equal(result.freed, true, 'Port should be successfully freed');
    assert.ok(
      result.killedPids.includes(child.pid!),
      `Killed PIDs should include dummy child PID (${child.pid})`
    );

    const nowAvailable = await PortManager.isPortAvailable(port);
    assert.equal(nowAvailable, true, 'Port should now be available for new server');
  } finally {
    try {
      child.kill('SIGKILL');
    } catch {
      // Ignore if already terminated
    }
  }
});
