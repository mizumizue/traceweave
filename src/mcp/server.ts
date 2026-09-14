import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createTraceWeaveMcpServer, type McpServerContext } from './create-server.js';
import { startMcpHttpServer } from './http-transport.js';

export type McpTransportMode = 'stdio' | 'http';

export interface StartMcpServerOptions extends Partial<McpServerContext> {
  transport?: McpTransportMode;
  host?: string;
  port?: number;
}

export async function startMcpServer(options: StartMcpServerOptions = {}): Promise<void> {
  const {
    docsDir = './docs',
    subjectOverride,
    transport = 'stdio',
    host = '127.0.0.1',
    port = 3100,
  } = options;

  const context: McpServerContext = { docsDir, subjectOverride };

  if (transport === 'http') {
    const httpServer = await startMcpHttpServer({ host, port, context });
    console.error(`TraceWeave MCP HTTP server listening on http://${host}:${port}/mcp`);
    await new Promise<void>(resolve => {
      httpServer.on('close', () => resolve());
    });
    return;
  }

  const server = createTraceWeaveMcpServer(context);
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}
