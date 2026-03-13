"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

const CATEGORIES = [
  { id: "top", label: "Tops", icon: "M12 2l4 4H8l4-4zM4 8h16v12H4z" },
  { id: "bottom", label: "Bottoms", icon: "M6 4h12l-2 16H8z" },
  { id: "shoes", label: "Shoes", icon: "M4 16c0-2 2-4 4-4h8c2 0 4 2 4 4v2H4z" },
  { id: "outerwear", label: "Outerwear", icon: "M12 3L4 9v12h16V9z" },
  { id: "socks", label: "Socks", icon: "M8 4h8v8c0 4-8 4-8 0z" },
  { id: "accessory", label: "Accessories", icon: "M12 2a4 4 0 00-4 4v2h8V6a4 4 0 00-4-4zM6 10v10h12V10z" },
] as const;

interface WardrobeUploadStepProps {
  onNext: () => void;
  onBack: () => void;
}

interface CategoryFiles {
  [category: string]: { file: File; preview: string }[];
}

export function WardrobeUploadStep({ onNext, onBack }: WardrobeUploadStepProps) {
  const { token } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>(CATEGORIES[0].id);
  const [files, setFiles] = useState<CategoryFiles>({});
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentFiles = files[activeCategory] ?? [];
  const totalFiles = Object.values(files).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFiles((prev) => ({
      ...prev,
      [activeCategory]: [...(prev[activeCategory] ?? []), ...newFiles],
    }));
    setUploaded(false);
  };

  const removeFile = (category: string, index: number) => {
    setFiles((prev) => ({
      ...prev,
      [category]: (prev[category] ?? []).filter((_, i) => i !== index),
    }));
    setUploaded(false);
  };

  const handleUpload = async () => {
    if (totalFiles === 0 || !token) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("bucket", "wardrobes");

      for (const [category, items] of Object.entries(files)) {
        for (const item of items) {
          formData.append("file", item.file);
          formData.append(`category_file`, category);
        }
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      setUploaded(true);
    } catch {
      // retry
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Build your wardrobe</h2>
        <p className="mt-1 text-sm text-muted">
          Tap a category, then upload photos of your clothing items
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => {
          const count = (files[cat.id] ?? []).length;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "border-foreground/30 bg-foreground/10 text-foreground"
                  : "border-border bg-card text-muted hover:text-foreground"
              }`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="opacity-60"
              >
                <path d={cat.icon} />
              </svg>
              {cat.label}
              {count > 0 && (
                <span className="rounded-full bg-foreground/20 px-1.5 py-0.5 text-[10px]">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Upload area */}
      <div
        className="flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/60 bg-card/30 p-4 transition-colors hover:border-silver/40"
        onClick={() => inputRef.current?.click()}
      >
        {currentFiles.length === 0 ? (
          <>
            <svg
              width="24"
              height="24"
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
            <span className="text-xs text-muted">
              Add {CATEGORIES.find((c) => c.id === activeCategory)?.label} photos
            </span>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {currentFiles.map((f, i) => (
              <div key={i} className="relative">
                <img
                  src={f.preview}
                  alt={f.file.name}
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(activeCategory, i);
                  }}
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] text-white"
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

      <p className="text-center text-xs text-muted">
        {totalFiles} item{totalFiles !== 1 ? "s" : ""} across all categories
      </p>

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
            disabled={totalFiles === 0 || uploading}
            className="rounded-xl bg-foreground px-8 py-2.5 text-sm font-medium text-background transition-all hover:bg-foreground/90 disabled:opacity-40"
          >
            {uploading ? "Uploading..." : `Upload ${totalFiles} items`}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="rounded-xl bg-foreground px-8 py-2.5 text-sm font-medium text-background transition-all hover:bg-foreground/90"
          >
            Continue to indexing
          </button>
        )}
      </div>
    </div>
  );
}
