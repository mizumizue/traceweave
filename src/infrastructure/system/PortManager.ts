import net from 'node:net';

/** Port availability probe for dashboard serve. */
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
}
