import http from 'node:http';
import type { Request, Response } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { createTraceWeaveMcpServer, type McpServerContext } from './create-server.js';

export interface McpHttpServerOptions {
  host: string;
  port: number;
  context: McpServerContext;
}

export async function startMcpHttpServer(options: McpHttpServerOptions): Promise<http.Server> {
  const app = createMcpExpressApp({ host: options.host });

  app.post('/mcp', async (req: Request, res: Response) => {
    const server = createTraceWeaveMcpServer(options.context);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        void transport.close();
        void server.close();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed. Use POST /mcp for Streamable HTTP.' },
      id: null,
    });
  });

  return new Promise((resolve, reject) => {
    const httpServer = app.listen(options.port, options.host, () => {
      resolve(httpServer);
    });
    httpServer.on('error', reject);
  });
}

