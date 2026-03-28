import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Anthropic SDK before importing the route
const mockCreate = vi.fn();
vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    static APIError = class APIError extends Error {
      status: number;
      constructor(status: number, message: string) {
        super(message);
        this.status = status;
      }
    };

    messages = { create: mockCreate };
  },
}));

// Must import after mocks
const { POST } = await import("@/app/api/chat/route");

function makeRequest(body: object): Request {
  return new Request("http://localhost:3000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockCreate.mockReset();
});

describe("POST /api/chat", () => {
  it("returns AI response for valid request", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "I see a cabin with a gable roof." }],
    });

    const req = makeRequest({
      promptType: "analyzeImage",
      messages: [{ role: "user", content: "Analyze this" }],
    });

    const res = await POST(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.response).toBe("I see a cabin with a gable roof.");
  });

  it("returns 400 for unknown prompt type", async () => {
    const req = makeRequest({
      promptType: "unknownPrompt",
      messages: [{ role: "user", content: "test" }],
    });

    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Unknown prompt type");
  });

  it("builds vision message when image is provided", async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "I see a floor plan." }],
    });

    const req = makeRequest({
      promptType: "analyzeImage",
      messages: [{
        role: "user",
        content: "Analyze this",
        imageBase64: "abc123",
        imageMediaType: "image/png",
      }],
    });

    await POST(req as any);

    const call = mockCreate.mock.calls[0][0];
    expect(call.messages[0].content[0].type).toBe("image");
    expect(call.messages[0].content[0].source.data).toBe("abc123");
    expect(call.messages[0].content[1].type).toBe("text");
  });

  it("returns 500 on generic errors", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Network failure"));

    const req = makeRequest({
      promptType: "analyzeImage",
      messages: [{ role: "user", content: "test" }],
    });

    const res = await POST(req as any);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Something went wrong");
  });
});
