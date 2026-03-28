import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_PROMPTS, type PromptType } from "@/lib/prompts";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatRequest {
  promptType: PromptType;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    imageBase64?: string;
    imageMediaType?: string;
  }>;
}

// Limit request body to 25MB (slightly above client's 20MB image limit + JSON overhead)
const MAX_BODY_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Request too large." }, { status: 413 });
    }

    const body: ChatRequest = await req.json();
    const { promptType, messages } = body;

    const systemPrompt = SYSTEM_PROMPTS[promptType];
    if (!systemPrompt) {
      return NextResponse.json(
        { error: `Unknown prompt type: ${promptType}` },
        { status: 400 }
      );
    }

    // Build Anthropic messages with vision support
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((msg) => {
      if (msg.imageBase64 && msg.imageMediaType) {
        return {
          role: msg.role,
          content: [
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: msg.imageMediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: msg.imageBase64,
              },
            },
            {
              type: "text" as const,
              text: msg.content || "Please analyze this image.",
            },
          ],
        };
      }
      return {
        role: msg.role,
        content: msg.content,
      };
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    });

    const textContent = response.content.find((c) => c.type === "text");
    const text = textContent && "text" in textContent ? textContent.text : "";

    return NextResponse.json({ response: text });
  } catch (error) {
    console.error("Chat API error:", error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Rate limited. Please wait a moment and try again." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `AI service error: ${error.message}` },
        { status: error.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
