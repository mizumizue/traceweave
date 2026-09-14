import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { callMcpTool, listMcpTools } from './tool-handlers.js';
import { getMcpPrompt, listMcpPrompts } from './prompt-handlers.js';
import {
  listDocResourceTemplates,
  listDocResources,
  readDocResource,
} from './resource-handlers.js';

export interface McpServerContext {
  docsDir: string;
  subjectOverride?: string;
}

export function createTraceWeaveMcpServer(context: McpServerContext): Server {
  const server = new Server(
    {
      name: 'traceweave-mcp',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
      instructions:
        'TraceWeave MCP exposes V-Model traceability analysis, document resources, and authoring prompts. Use tools for JSON analytics; read traceweave-doc:// resources for raw markdown.',
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: listMcpTools(),
  }));

  server.setRequestHandler(CallToolRequestSchema, async request => {
    const { name, arguments: args } = request.params;
    const result = callMcpTool(context.docsDir, name, (args as Record<string, unknown>) || {}, {
      subjectOverride: context.subjectOverride,
    });
    return {
      isError: result.isError,
      content: [{ type: 'text', text: result.text }],
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: listDocResources(context.docsDir),
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: listDocResourceTemplates(),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async request => {
    const { uri } = request.params;
    const resource = readDocResource(context.docsDir, uri);
    return {
      contents: [
        {
          uri: resource.uri,
          mimeType: resource.mimeType,
          text: resource.text,
        },
      ],
    };
  });

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: listMcpPrompts(),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async request => {
    const { name, arguments: args } = request.params;
    try {
      return getMcpPrompt(name, (args as Record<string, unknown>) || {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(message);
    }
  });

  return server;
}
