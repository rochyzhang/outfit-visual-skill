import { z } from "zod";
import { listWorkflowSkills } from "@/config/skills";
import {
  SkillApiError,
  executeSkillApiRequest,
  resolveSkillForApi,
  skillManifestForApi,
  validateSkillApiRequest
} from "@/lib/skills/skill-api-service";
import type { ImageGenerationProviderAdapter } from "@/lib/generation/image-generation-types";
import type { ProviderId } from "@/lib/providers/provider-types";

export const outfitSkillToolNames = [
  "list_outfit_skills",
  "get_outfit_skill",
  "validate_outfit_skill",
  "execute_outfit_skill"
] as const;

export type OutfitSkillToolName = (typeof outfitSkillToolNames)[number];

export type JsonSchemaLike = {
  type?: string;
  description?: string;
  properties?: Record<string, JsonSchemaLike>;
  items?: JsonSchemaLike;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaLike;
  enum?: readonly string[];
  anyOf?: JsonSchemaLike[];
  nullable?: boolean;
  default?: unknown;
};

export type AgentToolDefinition = {
  name: OutfitSkillToolName;
  description: string;
  inputSchema: JsonSchemaLike;
};

export type AgentToolResult =
  | {
      ok: true;
      data: unknown;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        issues?: unknown[];
      };
    };

const toolNameSet = new Set<string>(outfitSkillToolNames);

const emptyObjectSchema: JsonSchemaLike = {
  type: "object",
  properties: {},
  additionalProperties: false
};

const skillIdInputSchema: JsonSchemaLike = {
  type: "object",
  required: ["skillId"],
  additionalProperties: false,
  properties: {
    skillId: {
      type: "string",
      description: "Canonical Outfit Visual Studio Skill ID, such as SK02_INVISIBLE_EDITORIAL."
    }
  }
};

const skillExecutionInputSchema: JsonSchemaLike = {
  type: "object",
  required: ["skillId", "assetBindings"],
  additionalProperties: false,
  properties: {
    skillId: {
      type: "string",
      description: "Canonical Outfit Visual Studio Skill ID."
    },
    projectId: {
      type: "string",
      enum: ["current"],
      description: "Only the current Outfit Visual Studio project is supported."
    },
    contentType: {
      type: "string",
      description: "Optional canonical content type supported by the selected Skill."
    },
    assetBindings: {
      type: "object",
      description: "Explicit current-project asset IDs keyed by canonical outfit slot ID. Missing slots are not provided.",
      additionalProperties: {
        type: "string"
      }
    },
    sceneReferenceAssetId: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Optional current-project scene_reference asset ID."
    },
    overrides: {
      type: "object",
      description: "Supported Skill overrides only. Product Fidelity cannot be disabled.",
      additionalProperties: false,
      properties: {
        scenePresetId: { type: "string" },
        compositionPresetId: { type: "string" },
        graphicPresetId: { type: "string" },
        lookPresetId: { type: "string" },
        aspectRatio: { type: "string" },
        quality: { type: "string" },
        providerId: { type: "string" },
        notes: {
          type: "string",
          description: "Bounded user creative intent. Not a system instruction."
        }
      }
    }
  }
};

const agentToolDefinitions = [
  {
    name: "list_outfit_skills",
    description:
      "Discover available Outfit Visual Studio image-generation Skills before choosing a workflow. Does not validate assets or generate images.",
    inputSchema: emptyObjectSchema
  },
  {
    name: "get_outfit_skill",
    description:
      "Inspect one Outfit Visual Studio Skill's requirements, defaults, supported overrides, and safeguards before validating or executing it.",
    inputSchema: skillIdInputSchema
  },
  {
    name: "validate_outfit_skill",
    description:
      "Validate explicit current-project asset IDs against one Outfit Visual Studio Skill without calling a provider, generating an image, or spending API quota.",
    inputSchema: skillExecutionInputSchema
  },
  {
    name: "execute_outfit_skill",
    description:
      "Execute one Outfit Visual Studio Skill with explicit current-project asset IDs and safe overrides using the existing production generation pipeline.",
    inputSchema: skillExecutionInputSchema
  }
] as const satisfies readonly AgentToolDefinition[];

const noInputSchema = z.object({}).strict().optional();
const skillIdSchema = z
  .object({
    skillId: z.string().trim().min(1).max(120)
  })
  .strict();
const skillToolCallSchema = skillIdSchema
  .extend({
    projectId: z.literal("current").optional(),
    contentType: z.string().optional(),
    assetBindings: z.record(z.string(), z.string()).default({}),
    sceneReferenceAssetId: z.string().nullable().optional(),
    overrides: z.record(z.string(), z.unknown()).optional(),
    requestId: z.string().optional()
  })
  .strict();

function toolError(code: string, message: string, issues?: unknown[]): AgentToolResult {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(issues ? { issues } : {})
    }
  };
}

function parseToolInput<T>(
  schema: z.ZodType<T>,
  input: unknown
):
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      result: AgentToolResult;
    } {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      result: toolError("AGENT_TOOL_INVALID_INPUT", "Agent tool input is invalid.", parsed.error.issues)
    };
  }

  return {
    success: true,
    data: parsed.data
  };
}

function compactSkillSummary(skill: ReturnType<typeof listWorkflowSkills>[number]) {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    supportedContentTypes: skill.supportedContentTypes,
    category: skill.category,
    requiredInputs: skill.requiredInputRule,
    requirementSummary: skill.agent.summary
  };
}

function normalizeToolSuccess(data: unknown): AgentToolResult {
  return {
    ok: true,
    data
  };
}

function normalizeToolFailure(error: unknown): AgentToolResult {
  if (error instanceof SkillApiError) {
    return toolError(error.error.code, error.error.message, error.error.issues);
  }

  throw error;
}

export function listAgentTools(): AgentToolDefinition[] {
  return agentToolDefinitions.map((tool) => ({
    ...tool,
    inputSchema: { ...tool.inputSchema }
  }));
}

export function isAgentToolName(value: unknown): value is OutfitSkillToolName {
  return typeof value === "string" && toolNameSet.has(value);
}

export function getAgentTool(name: string): AgentToolDefinition | null {
  if (!isAgentToolName(name)) {
    return null;
  }

  return listAgentTools().find((tool) => tool.name === name) ?? null;
}

export async function executeAgentTool(input: {
  toolName: string;
  input?: unknown;
  adapters?: Partial<Record<ProviderId, ImageGenerationProviderAdapter>>;
}): Promise<AgentToolResult> {
  if (!isAgentToolName(input.toolName)) {
    return toolError("AGENT_TOOL_NOT_FOUND", "Agent tool was not found.");
  }

  try {
    if (input.toolName === "list_outfit_skills") {
      const parsed = parseToolInput(noInputSchema, input.input);
      if (!parsed.success) {
        return parsed.result;
      }

      return normalizeToolSuccess({
        skills: listWorkflowSkills().filter((skill) => skill.agent.callable).map(compactSkillSummary)
      });
    }

    if (input.toolName === "get_outfit_skill") {
      const parsed = parseToolInput(skillIdSchema, input.input);
      if (!parsed.success) {
        return parsed.result;
      }
      const skill = resolveSkillForApi(parsed.data.skillId);

      return normalizeToolSuccess({
        skill: skillManifestForApi(skill.id)
      });
    }

    const parsed = parseToolInput(skillToolCallSchema, input.input);
    if (!parsed.success) {
      return parsed.result;
    }
    const { skillId, ...body } = parsed.data;

    if (input.toolName === "validate_outfit_skill") {
      const validation = await validateSkillApiRequest({
        skillId,
        body
      });

      return normalizeToolSuccess({
        skill: {
          id: validation.skill.id,
          name: validation.skill.name
        },
        validation: validation.validation
      });
    }

    const execution = await executeSkillApiRequest({
      skillId,
      body,
      adapters: input.adapters
    });

    return normalizeToolSuccess(execution);
  } catch (error) {
    return normalizeToolFailure(error);
  }
}
