import { execFileSync } from 'node:child_process';
import net from 'node:net';

export interface ReclaimPortOptions {
  timeoutMs?: number;
  pollMs?: number;
}

export interface ReclaimPortResult {
  reclaimed: boolean;
  killedPids: number[];
}

/** Port availability probe and reclamation for dashboard serve. */
export class PortManager {
  static isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const tester = net
        .createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
          tester.once('close', () => resolve(true)).close();
        })
        .listen(port);
    });
  }

  static findListeningPids(port: number): number[] {
    const pids = new Set<number>();
    const portPattern = new RegExp(`:${port}(?:\\s|$)`);

    if (process.platform === 'win32') {
      const output = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
      for (const line of output.split('\n')) {
        if (!line.includes('LISTENING') || !portPattern.test(line)) continue;
        const pid = parseInt(line.trim().split(/\s+/).at(-1) ?? '', 10);
        if (Number.isFinite(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    } else {
      try {
        const output = execFileSync('lsof', ['-ti', `:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' });
        for (const line of output.split('\n')) {
          const pid = parseInt(line.trim(), 10);
          if (Number.isFinite(pid) && pid > 0) {
            pids.add(pid);
          }
        }
      } catch {
        // lsof exits 1 when nothing is listening.
      }
    }

    return [...pids].filter(pid => pid !== process.pid);
  }

  static killPid(pid: number): void {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/F'], { stdio: 'ignore' });
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      return;
    }

    try {
      process.kill(pid, 0);
      process.kill(pid, 'SIGKILL');
    } catch {
      // Process already exited after SIGTERM.
    }
  }

  static async reclaimPort(port: number, options: ReclaimPortOptions = {}): Promise<ReclaimPortResult> {
    const timeoutMs = options.timeoutMs ?? 5000;
    const pollMs = options.pollMs ?? 100;
    const killedPids = PortManager.findListeningPids(port);

    for (const pid of killedPids) {
      PortManager.killPid(pid);
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await PortManager.isPortAvailable(port)) {
        return { reclaimed: true, killedPids };
      }
      await new Promise(resolve => setTimeout(resolve, pollMs));
    }

    return { reclaimed: false, killedPids };
  }
}
