import { execSync } from 'node:child_process';
import net from 'node:net';

export interface PortFreeResult {
  freed: boolean;
  killedPids: number[];
  error?: string;
}

export class PortManager {
  /**
   * ポートが現在リッスン可能（空いている）かどうか判定する
   */
  static isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const tester = net
        .createServer()
        .once('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            resolve(false);
          } else {
            resolve(false);
          }
        })
        .once('listening', () => {
          tester
            .once('close', () => {
              resolve(true);
            })
            .close();
        })
        .listen(port);
    });
  }

  /**
   * 指定ポートを専有（LISTENING）しているプロセスの PID 一覧を取得する
   */
  static async getPidsOnPort(port: number): Promise<number[]> {
    const isWin = process.platform === 'win32';
    const currentPid = process.pid;

    if (isWin) {
      try {
        const stdout = execSync('netstat -ano -p tcp', {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const lines = stdout.split('\n');
        const pids = new Set<number>();
        // Match lines like: TCP    0.0.0.0:3000    0.0.0.0:0    LISTENING    11568
        // Or TCP    [::]:3000       [::]:0       LISTENING    11568
        const regex = new RegExp(`^\\s*TCP\\s+.*?:${port}\\s+.*?LISTENING\\s+(\\d+)`, 'i');
        for (const line of lines) {
          const match = line.match(regex);
          if (match) {
            const pid = parseInt(match[1], 10);
            if (pid && pid !== currentPid && pid !== 0) {
              pids.add(pid);
            }
          }
        }
        return Array.from(pids);
      } catch {
        return [];
      }
    } else {
      try {
        const stdout = execSync(`lsof -ti :${port} -sTCP:LISTEN`, {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const lines = stdout.trim().split(/\s+/);
        const pids = new Set<number>();
        for (const line of lines) {
          const pid = parseInt(line.trim(), 10);
          if (pid && pid !== currentPid && !isNaN(pid)) {
            pids.add(pid);
          }
        }
        return Array.from(pids);
      } catch {
        return [];
      }
    }
  }

  /**
   * 指定 PID のプロセスを強制終了する
   */
  static killPid(pid: number): boolean {
    const isWin = process.platform === 'win32';
    if (isWin) {
      try {
        execSync(`taskkill /F /T /PID ${pid}`, { stdio: 'ignore' });
        return true;
      } catch {
        try {
          process.kill(pid, 'SIGKILL');
          return true;
        } catch {
          return false;
        }
      }
    } else {
      try {
        process.kill(pid, 'SIGKILL');
        return true;
      } catch {
        try {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          return true;
        } catch {
          return false;
        }
      }
    }
  }

  /**
   * ポートが解放されるまで待機する
   */
  static async waitUntilFree(port: number, timeoutMs = 3000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      const available = await this.isPortAvailable(port);
      if (available) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  /**
   * ポートを専有している先行プロセスを特定・強制終了し、解放を待機する
   */
  static async ensurePortFree(port: number, timeoutMs = 3000): Promise<PortFreeResult> {
    const initialAvailable = await this.isPortAvailable(port);
    if (initialAvailable) {
      return { freed: true, killedPids: [] };
    }

    const pids = await this.getPidsOnPort(port);
    const killedPids: number[] = [];

    for (const pid of pids) {
      if (this.killPid(pid)) {
        killedPids.push(pid);
      }
    }

    const freed = await this.waitUntilFree(port, timeoutMs);
    return {
      freed,
      killedPids,
      error: freed
        ? undefined
        : `Port ${port} remains in use after attempting to terminate processes: [${pids.join(', ')}]`,
    };
  }
}
