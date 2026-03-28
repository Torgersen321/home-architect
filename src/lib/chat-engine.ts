import { getBase64Data } from "./image-utils";
import { validateGeometry, validatePhysics, type GeometryIR } from "./geometry-schema";
import type { PromptType } from "./prompts";
import type { RoadmapPhase } from "./store";

interface ApiMessage {
  role: "user" | "assistant";
  content: string;
  imageBase64?: string;
  imageMediaType?: string;
}

async function callApi(promptType: PromptType, messages: ApiMessage[]): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ promptType, messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error || `API error: ${res.status}`);
  }

  const data = await res.json();
  return data.response;
}

/**
 * Send an image to Claude for initial analysis.
 * Returns the AI's description and request for anchor dimension.
 */
export async function analyzeImage(imageDataUrl: string, userMessage?: string): Promise<string> {
  const { mediaType, data } = getBase64Data(imageDataUrl);

  const messages: ApiMessage[] = [
    {
      role: "user",
      content: userMessage || "Please analyze this building plan / sketch and help me create a 3D model from it.",
      imageBase64: data,
      imageMediaType: mediaType,
    },
  ];

  return callApi("analyzeImage", messages);
}

/**
 * Generate a GeometryIR model from the image analysis + anchor dimension.
 * Returns validated GeometryIR or throws with specific errors.
 */
export async function generateModel(
  imageAnalysis: string,
  anchorDescription: string,
  anchorValue: number,
  sourceType: "blueprint" | "sketch" | "photo",
  imageDataUrl?: string,
): Promise<GeometryIR> {
  const prompt = `Based on this analysis of the building:
${imageAnalysis}

The user provided an anchor measurement: ${anchorDescription} = ${anchorValue} meters.
Source type: ${sourceType}

Generate the GeometryIR JSON for this building. Use the anchor measurement to scale all dimensions proportionally.`;

  const messages: ApiMessage[] = [];

  if (imageDataUrl) {
    const { mediaType, data } = getBase64Data(imageDataUrl);
    messages.push({
      role: "user",
      content: prompt,
      imageBase64: data,
      imageMediaType: mediaType,
    });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  const response = await callApi("generateModel", messages);

  // Extract JSON from response (Claude sometimes wraps in markdown)
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("AI did not return valid JSON. Please try again.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error("AI returned malformed JSON. Please try again.");
  }

  const validation = validateGeometry(parsed);
  if (!validation.success) {
    throw new Error(`Invalid geometry: ${validation.errors.join(", ")}`);
  }

  const physicsWarnings = validatePhysics(validation.data);
  if (physicsWarnings.length > 0) {
    console.warn("Physics warnings:", physicsWarnings);
  }

  return validation.data;
}

/**
 * Refine the model based on user feedback.
 * Returns either updated GeometryIR or a clarifying question string.
 */
export async function refineModel(
  currentModel: GeometryIR,
  feedback: string,
): Promise<{ type: "model"; data: GeometryIR } | { type: "question"; text: string }> {
  const messages: ApiMessage[] = [
    {
      role: "user",
      content: `Current model:\n${JSON.stringify(currentModel, null, 2)}\n\nUser feedback: ${feedback}`,
    },
  ];

  const response = await callApi("refineModel", messages);

  // Check if it's a question (no JSON) or an updated model
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { type: "question", text: response };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return { type: "question", text: response };
  }

  const validation = validateGeometry(parsed);
  if (!validation.success) {
    return { type: "question", text: `I had trouble updating the model. Could you be more specific about: ${feedback}?` };
  }

  return { type: "model", data: validation.data };
}

/**
 * Generate a construction roadmap from the GeometryIR model.
 */
export async function generateRoadmap(model: GeometryIR): Promise<RoadmapPhase[]> {
  const messages: ApiMessage[] = [
    {
      role: "user",
      content: `Generate a construction roadmap for this building:\n${JSON.stringify(model, null, 2)}`,
    },
  ];

  const response = await callApi("generateRoadmap", messages);

  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("AI did not return a valid roadmap. Please try again.");
  }

  try {
    const phases: RoadmapPhase[] = JSON.parse(jsonMatch[0]);
    return phases;
  } catch {
    throw new Error("AI returned malformed roadmap. Please try again.");
  }
}
