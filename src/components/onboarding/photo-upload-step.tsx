"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

interface PhotoUploadStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function PhotoUploadStep({ onNext, onBack }: PhotoUploadStepProps) {
  const { token } = useAuth();
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 4));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setUploaded(false);
  };

  const handleUpload = async () => {
    if (photos.length === 0 || !token) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("bucket", "profiles");
      photos.forEach((p) => formData.append("file", p.file));

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      setUploaded(true);
    } catch {
      // retry silently
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">
          Upload your photos
        </h2>
        <p className="mt-1 text-sm text-muted">
          1-2 full-body standing photos so AI can visualize outfits on you
        </p>
      </div>

      <div
        className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/60 bg-card/30 p-6 transition-colors hover:border-silver/40"
        onClick={() => inputRef.current?.click()}
      >
        {photos.length === 0 ? (
          <>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-muted"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className="text-sm text-muted">
              Click to select photos
            </span>
          </>
        ) : (
          <div className="flex gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative">
                <img
                  src={p.preview}
                  alt={`Photo ${i + 1}`}
                  className="h-40 w-28 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(i);
                  }}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-border px-6 py-2.5 text-sm text-foreground transition-colors hover:bg-card"
        >
          Back
        </button>
        <div className="flex-1" />
        {!uploaded ? (
          <button
            type="button"
            onClick={handleUpload}
            disabled={photos.length === 0 || uploading}
            className="rounded-xl bg-foreground px-8 py-2.5 text-sm font-medium text-background transition-all hover:bg-foreground/90 disabled:opacity-40"
          >
            {uploading ? "Uploading..." : "Upload photos"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-foreground px-8 py-2.5 text-sm font-medium text-background transition-all hover:bg-foreground/90"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
