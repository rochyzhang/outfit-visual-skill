import { z } from "zod";

const stringArraySchema = z.array(z.string());

export const sceneRefinementSchema = z.object({
  originalIntent: z.string(),
  environment: z.string(),
  background: z.string(),
  surface: z.string(),
  spatialContext: z.string(),
  desiredMood: z.string(),
  includeElements: stringArraySchema,
  excludeElements: stringArraySchema,
  refinedScenePrompt: z.string(),
  lookNotes: z.object({
    lighting: z.string().optional(),
    color: z.string().optional(),
    mood: z.string().optional()
  }),
  warnings: stringArraySchema
});

export const sceneReferenceAnalysisSchema = z.object({
  environment: z.object({
    type: z.string(),
    background: z.string(),
    surface: z.string(),
    spatialContext: z.string(),
    visibleProps: stringArraySchema
  }),
  lighting: z.object({
    direction: z.string(),
    softness: z.string(),
    intensity: z.string(),
    naturalVsArtificial: z.string()
  }),
  color: z.object({
    dominantPalette: stringArraySchema,
    saturation: z.string(),
    temperature: z.string()
  }),
  texture: z.object({
    backgroundTexture: z.string(),
    photographicTexture: z.string()
  }),
  mood: z.string(),
  compositionNotes: stringArraySchema,
  scenePromptSuggestion: z.string(),
  lookSuggestions: z.object({
    lighting: z.string(),
    color: z.string(),
    contrast: z.string(),
    texture: z.string(),
    mood: z.string()
  }),
  warnings: stringArraySchema
});

export type SceneRefinementResult = z.infer<typeof sceneRefinementSchema>;
export type SceneReferenceAnalysisResult = z.infer<typeof sceneReferenceAnalysisSchema>;
