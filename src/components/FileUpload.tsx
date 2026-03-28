"use client";

import { useCallback, useState } from "react";
import { resizeImage, isValidImageType } from "@/lib/image-utils";

interface FileUploadProps {
  onImageUploaded: (dataUrl: string) => void;
  disabled?: boolean;
}

export function FileUpload({ onImageUploaded, disabled }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!isValidImageType(file)) {
        setError("Please upload a JPG, PNG, or WebP image.");
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        setError("File too large. Max 20MB.");
        return;
      }

      setIsProcessing(true);
      try {
        const resized = await resizeImage(file);
        onImageUploaded(resized);
      } catch {
        setError("Failed to process image. Please try another file.");
      } finally {
        setIsProcessing(false);
      }
    },
    [onImageUploaded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFile(file);
    };
    input.click();
  }, [handleFile]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={disabled ? undefined : handleClick}
      className={`
        flex flex-col items-center justify-center gap-3 p-8
        border-2 border-dashed rounded-xl transition-all
        ${isDragging ? "border-zinc-900 bg-zinc-50" : "border-zinc-300 hover:border-zinc-400"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        ${isProcessing ? "animate-pulse" : ""}
      `}
    >
      <div className="text-4xl opacity-30">
        {isProcessing ? "⏳" : "📐"}
      </div>
      <div className="text-sm text-zinc-600">
        {isProcessing
          ? "Processing image..."
          : "Drop your blueprint, sketch, or photo here"}
      </div>
      <div className="text-xs text-zinc-400">
        JPG, PNG, or WebP (max 20MB)
      </div>
      {error && (
        <div className="text-xs text-red-600 mt-1">{error}</div>
      )}
    </div>
  );
}
