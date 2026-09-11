import { executeAgentTool, listAgentTools, type AgentToolResult } from "@/lib/agent-tools/outfit-skill-tools";
import type { ImageGenerationProviderAdapter } from "@/lib/generation/image-generation-types";
import type { ProviderId } from "@/lib/providers/provider-types";

type JsonRpcId = string | number | null;

export type McpTool = {
  name: string;
  description: string;
  inputSchema: unknown;
};

export type McpToolCallResult = {
  content: Array<{
    type: "text";
    text: string;
  }>;
  structuredContent: AgentToolResult;
};

type JsonRpcRequest = {
  jsonrpc?: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
};

type JsonRpcResponse =
  | {
      jsonrpc: "2.0";
      id: JsonRpcId;
      result: unknown;
    }
  | {
      jsonrpc: "2.0";
      id: JsonRpcId;
      error: {
        code: number;
        message: string;
        data?: unknown;
      };
    };

type ToolCallParams = {
  name?: unknown;
  arguments?: unknown;
};

export function listMcpSkillTools(): { tools: McpTool[] } {
  return {
    tools: listAgentTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
}

export async function callMcpSkillTool(input: {
  name: string;
  arguments?: unknown;
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}): Promise<McpToolCallResult> {
  const result = await executeAgentTool({
    toolName: input.name,
    input: input.arguments ?? {},
    adapters: input.adapters
  });

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result)
      }
    ],
    structuredContent: result
  };
}

function successResponse(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result
  };
}

function errorResponse(id: JsonRpcId, code: number, message: string, data?: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(data ? { data } : {})
    }
  };
}

function isToolCallParams(value: unknown): value is ToolCallParams {
  return typeof value === "object" && value !== null;
}

export async function handleMcpJsonRpcMessage(
  rawMessage: unknown,
  options: {
    adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
  } = {}
): Promise<JsonRpcResponse | null> {
  const request = rawMessage as JsonRpcRequest;
  const id = request.id ?? null;

  if (typeof request !== "object" || request === null || typeof request.method !== "string") {
    return errorResponse(id, -32600, "Invalid MCP JSON-RPC request.");
  }

  if (request.id === undefined) {
    return null;
  }

  if (request.method === "initialize") {
    return successResponse(id, {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: "outfit-visual-studio-skill-tools",
        version: "0.1.0"
      }
    });
  }

  if (request.method === "tools/list") {
    return successResponse(id, listMcpSkillTools());
  }

  if (request.method === "tools/call") {
    if (!isToolCallParams(request.params) || typeof request.params.name !== "string") {
      return errorResponse(id, -32602, "MCP tool call requires a string tool name.");
    }

    const result = await callMcpSkillTool({
      name: request.params.name,
      arguments: request.params.arguments,
      adapters: options.adapters
    });

    return successResponse(id, result);
  }

  if (request.method === "ping") {
    return successResponse(id, {});
  }

  return errorResponse(id, -32601, "MCP method not found.");
}
