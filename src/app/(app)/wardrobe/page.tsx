"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/firebase/auth-context";

interface WardrobeItem {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  color: string;
  colors: string[];
  imageUrl: string;
  storagePath?: string;
  tags?: string[];
}

const CATEGORY_TABS = [
  { id: "all", label: "All" },
  { id: "top", label: "Tops" },
  { id: "bottom", label: "Bottoms" },
  { id: "shoes", label: "Shoes" },
  { id: "outerwear", label: "Outerwear" },
  { id: "socks", label: "Socks" },
  { id: "accessory", label: "Accessories" },
] as const;

interface PersonPhoto {
  id: string;
  path: string;
  imageUrl: string;
}

export default function WardrobePage() {
  const { user, token, signOut } = useAuth();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("top");
  const inputRef = useRef<HTMLInputElement>(null);
  const [basePhotos, setBasePhotos] = useState<PersonPhoto[]>([]);
  const [uploadingBase, setUploadingBase] = useState(false);
  const baseInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState<string>("top");
  const [editSubCategory, setEditSubCategory] = useState("");
  const [editTags, setEditTags] = useState("");

  const loadWardrobe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/catalog", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setItems((await res.json()) as WardrobeItem[]);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadBasePhotos = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/user/photos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setBasePhotos((await res.json()) as PersonPhoto[]);
      }
    } catch {
      // silent
    }
  }, [token]);

  useEffect(() => {
    loadWardrobe();
    loadBasePhotos();
  }, [loadWardrobe, loadBasePhotos]);

  const handleBasePhotoUpload = async (files: FileList | null) => {
    if (!files || !token) return;
    setUploadingBase(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("file", f));
      await fetch("/api/user/photos", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      await loadBasePhotos();
    } catch {
      // silent
    } finally {
      setUploadingBase(false);
    }
  };

  const filteredItems =
    activeTab === "all" ? items : items.filter((i) => i.category === activeTab);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !token) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("bucket", "wardrobes");
      Array.from(files).forEach((f) => {
        formData.append("file", f);
        formData.append(`category_file`, uploadCategory);
      });
      await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      await loadWardrobe();
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  };

  const handleReindex = async () => {
    if (!token) return;
    setIndexing(true);
    try {
      await fetch("/api/index", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      await loadWardrobe();
    } catch {
      // silent
    } finally {
      setIndexing(false);
    }
  };

  const beginEdit = (item: WardrobeItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditSubCategory(item.subCategory ?? "");
    setEditTags((item.tags ?? []).join(", "));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditCategory("top");
    setEditSubCategory("");
    setEditTags("");
  };

  const saveEdit = async () => {
    if (!editingId || !token) return;
    try {
      const payload = {
        name: editName.trim(),
        category: editCategory as WardrobeItem["category"],
        subCategory: editSubCategory.trim() || null,
        tags: editTags
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      };
      await fetch(`/api/wardrobe/${encodeURIComponent(editingId)}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      await loadWardrobe();
      cancelEdit();
    } catch {
      // silent
    }
  };

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="relative border-b border-border/60 px-6 py-3.5">
        <div className="absolute inset-0 bg-gradient-to-r from-card via-background to-card opacity-60" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-foreground">
                  <path d="M20.38 3.46 16 2 12 5.5 8 2 3.62 3.46l.18 6.04L12 22l8.2-12.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-base font-semibold tracking-tight text-foreground">Dripcheck</h1>
            </a>
            <span className="text-xs text-muted">/</span>
            <span className="text-sm text-muted">Wardrobe</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/dashboard"
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors"
            >
              Dashboard
            </a>
            <span className="text-xs text-muted truncate max-w-[120px]">
              {user?.displayName ?? user?.email ?? ""}
            </span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md px-2 py-1 text-[11px] text-muted hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Actions bar */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground"
              >
                {CATEGORY_TABS.filter((t) => t.id !== "all").map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg bg-foreground px-4 py-1.5 text-xs font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Add items"}
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleReindex}
              disabled={indexing}
              className="rounded-lg border border-border px-4 py-1.5 text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
            >
              {indexing ? "Re-indexing..." : "Re-index wardrobe"}
            </button>
            <span className="text-xs text-muted">{items.length} items</span>
          </div>

          {/* Base Photos Section */}
          <div className="rounded-xl border border-border/60 bg-card/30 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Your base photos
                </h3>
                <p className="text-[11px] text-muted mt-0.5">
                  Full-body standing photos used for outfit generation
                </p>
              </div>
              <button
                type="button"
                onClick={() => baseInputRef.current?.click()}
                disabled={uploadingBase}
                className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground transition-colors disabled:opacity-50"
              >
                {uploadingBase ? "Uploading..." : "Add photos"}
              </button>
              <input
                ref={baseInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleBasePhotoUpload(e.target.files)}
              />
            </div>
            {basePhotos.length === 0 ? (
              <div
                className="flex h-28 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border/60 transition-colors hover:border-silver/40"
                onClick={() => baseInputRef.current?.click()}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-[11px] text-muted">
                    Upload 1-2 full-body standing photos
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                {basePhotos.map((photo) => {
                  const src = photo.path
                    ? `/api/image?path=${encodeURIComponent(photo.path)}`
                    : photo.imageUrl;
                  return (
                    <div key={photo.id} className="relative">
                      <img
                        src={src}
                        alt="Base photo"
                        className="h-32 w-24 rounded-lg border border-border/60 object-cover"
                      />
                    </div>
                  );
                })}
                <div
                  className="flex h-32 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border/60 transition-colors hover:border-silver/40"
                  onClick={() => baseInputRef.current?.click()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 border-b border-border/60 pb-2">
            {CATEGORY_TABS.map((tab) => {
              const count =
                tab.id === "all"
                  ? items.length
                  : items.filter((i) => i.category === tab.id).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                  {count > 0 && (
                    <span className="ml-1.5 text-[10px] opacity-60">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm text-muted">
                {items.length === 0
                  ? "No items yet. Upload some clothing photos!"
                  : "No items in this category."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredItems.map((item) => {
                const src = item.storagePath
                  ? `/api/image?path=${encodeURIComponent(item.storagePath)}`
                  : item.imageUrl;
                const isEditing = editingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="group overflow-hidden rounded-xl border border-border/60 bg-card/50 transition-colors hover:border-silver/40"
                  >
                    <div className="aspect-square overflow-hidden relative">
                      <img
                        src={src}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => beginEdit(item)}
                        className="absolute right-1.5 top-1.5 rounded-md bg-black/50 px-2 py-0.5 text-[10px] text-white shadow-sm hover:bg-black/70"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {!isEditing ? (
                        <>
                          <p className="truncate text-xs font-medium text-foreground">
                            {item.name}
                          </p>
                          <div className="mt-1 flex items-center gap-1.5">
                            <div
                              className="h-3 w-3 rounded-full border border-border/60"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-[10px] text-muted capitalize">
                              {item.subCategory
                                ? `${item.subCategory} · ${item.category}`
                                : item.category}
                            </span>
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {item.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded bg-border/50 px-1.5 py-0.5 text-[9px] text-muted"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Name (e.g. black jeans, Nike hoodie)"
                            className="w-full rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground"
                          />
                          <div className="flex gap-1.5">
                            <select
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground"
                            >
                              <option value="top">Top</option>
                              <option value="bottom">Bottom</option>
                              <option value="outerwear">Outerwear</option>
                              <option value="dress">Dress</option>
                              <option value="shoes">Shoes</option>
                              <option value="socks">Socks</option>
                              <option value="accessory">Accessory</option>
                              <option value="bag">Bag</option>
                            </select>
                            <input
                              type="text"
                              value={editSubCategory}
                              onChange={(e) =>
                                setEditSubCategory(e.target.value)
                              }
                              placeholder="Type (e.g. jeans, t-shirt, hoodie)"
                              className="flex-1 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground"
                            />
                          </div>
                          <input
                            type="text"
                            value={editTags}
                            onChange={(e) => setEditTags(e.target.value)}
                            placeholder="Tags/brand (comma separated, e.g. Nike, slim fit)"
                            className="w-full rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground"
                          />
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="rounded-md px-2 py-0.5 text-[10px] text-muted hover:text-foreground"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveEdit}
                              className="rounded-md bg-foreground px-2 py-0.5 text-[10px] font-medium text-background hover:bg-foreground/90"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
