"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { ProjectPost } from "@/lib/posts-store";
import { generatePostGeoEnhancements } from "@/lib/geo-enhancements";
import { SERVICE_AREA_TAGS } from "@/lib/site";
import { useAuth } from "@/lib/firebase/auth-context";

const CATEGORIES = ["Decks", "Gazebos", "Restoration", "Remodeling", "Carpentry", "Patios"] as const;

function resolveImageSrc(src: string | undefined): string {
  if (!src) return "/images/hero.jpg";
  return src;
}

export default function PostsManagerPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ProjectPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form State
  const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>("Decks");
  const [selectedArea, setSelectedArea] = useState<string>(SERVICE_AREA_TAGS[0]);
  const [caption, setCaption] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [autoDetectFeedback, setAutoDetectFeedback] = useState<string | null>(null);
  const [captionError, setCaptionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SEO_SUGGESTIONS: Record<typeof CATEGORIES[number], string[]> = {
    Decks: [
      "Custom multi-tier composite deck with black aluminum railings completed in Knoxville, TN by EVR Construction LLC.",
      "Low-maintenance composite deck installation with integrated stair lighting in Maryville, TN.",
      "Custom pressure-treated wood deck extension with built-in bench seating in West Knoxville, TN.",
    ],
    Gazebos: [
      "Custom shaded cedar gazebo with architectural shingles and finished ceiling built in Sevierville, TN by EVR Construction.",
      "Heavy timber outdoor pavilion with tongue-and-groove woodwork in Maryville, TN.",
      "Custom backyard pergola with heavy cedar posts and decorative rafters in Knoxville, TN.",
    ],
    Restoration: [
      "Full deck restoration, joist reinforcement, and weather-resistant protective staining completed in Knoxville, TN.",
      "Exterior porch railing repair and structural wood restoration in East Tennessee.",
      "Deck surface replacement and safety upgrade for residential property in Knoxville, TN.",
    ],
    Remodeling: [
      "Custom residential home remodeling and exterior carpentry expansion completed in West Knoxville, TN.",
      "Screened-in porch and outdoor living room remodel in Powell, TN.",
      "Exterior home renovation with custom cedar accents and finished woodwork in Knoxville, TN.",
    ],
    Carpentry: [
      "Custom structural framing, load-bearing header installation, and precision woodwork in Knoxville, TN.",
      "Architectural exterior trim, custom corbels, and detailed finish carpentry in Oak Ridge, TN.",
      "Licensed residential framing and heavy timber carpentry completed in Maryville, TN.",
    ],
    Patios: [
      "Covered patio extension with tongue-and-groove cedar ceiling and recessed lighting in Powell, TN.",
      "Custom outdoor living patio cover with finished posts and decorative brackets in Knoxville, TN.",
      "Enclosed patio construction with seamless roofline integration in East Tennessee.",
    ],
  };

  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  async function handleSuggestCaption() {
    setCaptionError(null);

    if (imagePreview) {
      setAnalyzingPhoto(true);
      try {
        const res = await fetch("/api/admin/posts/suggest-caption", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: imagePreview,
            currentCategory: selectedCategory,
            city: selectedArea.replace(/, TN$/, ""),
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          setCaptionError(
            data?.error ||
              "The caption could not be generated. Write one manually, or try again."
          );
          return;
        }

        if (data?.caption) setCaption(data.caption);
        if (
          typeof data?.category === "string" &&
          CATEGORIES.includes(data.category as (typeof CATEGORIES)[number])
        ) {
          setSelectedCategory(data.category as (typeof CATEGORIES)[number]);
        }
        return;
      } catch (err) {
        console.warn("AI caption request failed:", err);
        setCaptionError(
          "The caption could not be generated. Write one manually, or try again."
        );
        return;
      } finally {
        setAnalyzingPhoto(false);
      }
    }

    // No photo selected yet, so there is nothing for the model to look at.
    const list = SEO_SUGGESTIONS[selectedCategory] || SEO_SUGGESTIONS.Decks;
    const nextText = list[suggestionIndex % list.length];
    setCaption(nextText);
    setSuggestionIndex((prev) => prev + 1);
  }

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/posts")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setPosts(data.posts || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to load posts:", err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setPublishError("Image must be under 20MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 1920;
          let { width, height } = img;

          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.85);
            setImagePreview(compressed);
          } else {
            setImagePreview(rawDataUrl);
          }
        } catch {
          setImagePreview(rawDataUrl);
        }
      };
      img.onerror = () => {
        setImagePreview(rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function handlePublishPost(e: React.FormEvent) {
    e.preventDefault();
    if (!imagePreview || !caption.trim() || uploading) return;

    setUploading(true);
    setPublishError(null);
    try {
      // Ensure session cookie is fresh to prevent 1-hour token expiration
      if (user) {
        try {
          const token = await user.getIdToken();
          await fetch("/api/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        } catch (syncErr) {
          console.warn("Session refresh warning:", syncErr);
        }
      }

      const res = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          src: imagePreview,
          caption: caption.trim(),
          alt: `${selectedCategory} project — ${caption.trim()}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts([data.post, ...posts]);
        setCaption("");
        setImagePreview(null);
        setPublishError(null);
        setAutoDetectFeedback(null);
        setShowUploadModal(false);
      } else {
        const data = await res.json().catch(() => ({ error: "Server returned error" }));
        setPublishError(data.error || `Publish failed (${res.status})`);
      }
    } catch (err) {
      console.error("Failed to publish post:", err);
      setPublishError(err instanceof Error ? err.message : "Network error — check your connection.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDeletePost(id: string) {
    try {
      const res = await fetch(`/api/admin/posts?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts(posts.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header with Title and New Post Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Posts Manager</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload project photos with a caption to publish live to your portfolio and service galleries.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#1f2521] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2c352f] shadow-xs cursor-pointer"
        >
          <span>+ Upload Project Post</span>
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Total Live Projects
          </p>
          <p className="text-3xl font-bold text-slate-900 font-heading">
            {loading ? "..." : posts.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Categories Active
          </p>
          <p className="text-3xl font-bold text-blue-600 font-heading">
            {CATEGORIES.length}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Status
          </p>
          <p className="text-3xl font-bold text-emerald-600 font-heading">
            Live Synced
          </p>
        </div>
      </div>

      {/* Project Posts Grid */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs p-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <h3 className="font-heading text-base font-bold text-slate-900">
            Published Project Portfolio ({posts.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Shown in /projects &amp; service pages
          </span>
        </div>

        {loading ? (
          <p className="text-xs text-slate-400 py-8 text-center">Loading project posts...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map((post, index) => (
              <div
                key={post.id}
                className="group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:border-[#f4b400] transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Photo Container */}
                  <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
                    <Image
                      src={resolveImageSrc(post.src)}
                      alt={post.alt || post.caption || "Project photo"}
                      fill
                      unoptimized
                      priority={index < 4}
                      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute top-2.5 left-2.5 rounded-md bg-[#1f2521]/80 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-white uppercase tracking-wider">
                      {post.category}
                    </span>
                  </div>

                  {/* Caption Content */}
                  <div className="p-4">
                    <p className="text-xs leading-relaxed text-slate-700 font-medium">
                      {post.caption}
                    </p>
                  </div>
                </div>

                {/* Footer with Date & Delete */}
                <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{post.createdAt}</span>
                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Project Post Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200">
            <h3 className="font-heading text-lg font-bold text-slate-900">
              Upload Project Post
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Select a project photo and add a description caption.
            </p>

            <form onSubmit={handlePublishPost} className="mt-5 space-y-4">
              {/* Photo Upload Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Project Photo
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {imagePreview ? (
                  <div className="relative aspect-16/9 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      sizes="(max-width: 768px) 100vw, 500px"
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                      }}
                      className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white hover:bg-black/80"
                    >
                      Change Photo
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="h-8 w-8 text-slate-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-bold text-slate-700">Click to select photo</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WebP up to 10MB</p>
                  </div>
                )}
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Service Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as typeof CATEGORIES[number])}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-[#f4b400] focus:bg-white focus:outline-hidden"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Area Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Service Area
                </label>
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:border-[#f4b400] focus:bg-white focus:outline-hidden"
                >
                  {SERVICE_AREA_TAGS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Where this job was. The AI uses it to place the caption and to apply that city&apos;s posting brief.
                </p>
              </div>

              {/* Caption Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Photo Caption
                  </label>
                  {caption.trim().length > 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        const enhanced = generatePostGeoEnhancements(caption, caption);
                        if (
                          enhanced.serviceCategory &&
                          CATEGORIES.includes(enhanced.serviceCategory as (typeof CATEGORIES)[number])
                        ) {
                          setSelectedCategory(enhanced.serviceCategory as (typeof CATEGORIES)[number]);
                        }
                        setAutoDetectFeedback(`✓ Category: ${enhanced.serviceCategory} • Area: ${enhanced.locationTag}`);
                        setTimeout(() => setAutoDetectFeedback(null), 4000);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0284c7] hover:underline cursor-pointer"
                    >
                      <span>⚡ Auto-Detect Category &amp; Geo</span>
                    </button>
                  )}
                </div>
                {autoDetectFeedback && (
                  <div className="mb-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center justify-between">
                    <span>{autoDetectFeedback}</span>
                    <button
                      type="button"
                      onClick={() => setAutoDetectFeedback(null)}
                      className="text-emerald-600 hover:text-emerald-900 text-xs ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {captionError && (
                  <div className="mb-2 text-xs font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg flex items-start justify-between gap-2">
                    <span>{captionError}</span>
                    <button
                      type="button"
                      onClick={() => setCaptionError(null)}
                      className="text-rose-600 hover:text-rose-900 text-xs cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}
                <textarea
                  required
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. Raised composite deck with black aluminum railings completed in Maryville, TN."
                  className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-900 focus:border-[#f4b400] focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Publish Error Message */}
              {publishError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                  ⚠ {publishError}
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={analyzingPhoto}
                  onClick={handleSuggestCaption}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#f4b400]/40 bg-[#f4b400]/15 px-3 py-2 text-xs font-bold text-[#8f6804] hover:bg-[#f4b400]/25 hover:border-[#f4b400] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {analyzingPhoto ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-[#8f6804]" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Analyzing Photo...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-3.5 w-3.5 text-[#8f6804]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>{imagePreview ? "AI Vision Suggest" : "AI Suggest Caption"}</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUploadModal(false);
                      setImagePreview(null);
                      setCaption("");
                      setPublishError(null);
                      setAutoDetectFeedback(null);
                    }}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!imagePreview || !caption.trim() || uploading}
                    className="rounded-lg bg-[#1f2521] px-5 py-2 text-xs font-bold text-white hover:bg-[#2c352f] cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {uploading ? "Publishing..." : "Publish Post"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
