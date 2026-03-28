import { describe, it, expect } from "vitest";
import { getBase64Data, isValidImageType } from "@/lib/image-utils";

describe("getBase64Data", () => {
  it("extracts media type and data from a valid data URL", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";
    const result = getBase64Data(dataUrl);
    expect(result.mediaType).toBe("image/png");
    expect(result.data).toBe("iVBORw0KGgoAAAANSUhEUg==");
  });

  it("handles JPEG data URLs", () => {
    const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const result = getBase64Data(dataUrl);
    expect(result.mediaType).toBe("image/jpeg");
    expect(result.data).toBe("/9j/4AAQSkZJRg==");
  });

  it("throws on invalid data URL", () => {
    expect(() => getBase64Data("not-a-data-url")).toThrow("Invalid data URL");
    expect(() => getBase64Data("")).toThrow("Invalid data URL");
  });
});

describe("isValidImageType", () => {
  it("accepts JPEG", () => {
    expect(isValidImageType({ type: "image/jpeg" } as File)).toBe(true);
  });

  it("accepts PNG", () => {
    expect(isValidImageType({ type: "image/png" } as File)).toBe(true);
  });

  it("accepts WebP", () => {
    expect(isValidImageType({ type: "image/webp" } as File)).toBe(true);
  });

  it("rejects PDF", () => {
    expect(isValidImageType({ type: "application/pdf" } as File)).toBe(false);
  });

  it("rejects GIF", () => {
    expect(isValidImageType({ type: "image/gif" } as File)).toBe(false);
  });
});
