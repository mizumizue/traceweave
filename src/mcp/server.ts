import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { callMcpTool, listMcpTools } from './tool-handlers.js';

export async function startMcpServer(docsDir: string = './docs', subjectOverride?: string) {
  const server = new Server(
    {
      name: 'traceweave-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listMcpTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;
    const result = callMcpTool(docsDir, name, (args as Record<string, unknown>) || {}, {
      subjectOverride,
    });
    return {
      isError: result.isError,
      content: [{ type: 'text', text: result.text }],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
