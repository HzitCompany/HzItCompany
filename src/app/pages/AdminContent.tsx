import { useEffect, useRef, useState } from "react";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { AdminShell } from "../components/admin/AdminShell";
import { CmsBlocksRenderer } from "../components/cms/CmsBlocks";
import { createAdminAssetUploadUrl, fetchAdminContent, upsertAdminContent } from "../services/platformService";
import { uploadFileToSignedUrl } from "../services/careersService";

export function AdminContent() {
  const { isAuthed, role } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<Array<{ key: string; value: unknown; updated_at: string }>>([])
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [draftKey, setDraftKey] = useState("");
  const [draftValue, setDraftValue] = useState("{}");

  const [uploading, setUploading] = useState(false);

  function load() {
    if (!isAuthed) return;
    setError(null);
    setLoading(true);
    fetchAdminContent()
      .then((r: any) => setItems(r.items))
      .catch((e: any) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isAuthed) return;
    if (role !== "admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, role]);

  async function save() {
    if (!isAuthed) return;
    setError(null);

    const key = draftKey.trim();
    if (!key) {
      setError("Key is required");
      return;
    }

    let value: unknown;
    try {
      value = JSON.parse(draftValue);
    } catch {
      setError("Value must be valid JSON");
      return;
    }

    setLoading(true);
    try {
      await upsertAdminContent({ key, value });
      setDraftKey("");
      setDraftValue("{}");
      load();
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function onPickImage(file: File) {
    setError(null);

    let current: any;
    try {
      current = JSON.parse(draftValue);
    } catch {
      setError("Draft JSON is invalid. Fix it before uploading an image.");
      return;
    }

    setUploading(true);
    try {
      const r = await createAdminAssetUploadUrl({
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size
      });

      await uploadFileToSignedUrl(r.signedUrl, file);

      const nextValue: any = (current && typeof current === "object") ? { ...current } : {};
      const blocks: any[] = Array.isArray(nextValue.blocks) ? [...nextValue.blocks] : [];
      blocks.push({ type: "image", src: r.publicUrl, alt: "" });
      nextValue.blocks = blocks;

      setDraftValue(JSON.stringify(nextValue, null, 2));
    } catch (e: any) {
      setError(e?.message ?? "Image upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (!isAuthed || role !== "admin") {
    return <div className="p-10 text-center">Access Denied</div>;
  }

  let parsedDraft: unknown = null;
  let draftParseError: string | null = null;
  try {
    parsedDraft = JSON.parse(draftValue);
  } catch {
    draftParseError = "Draft JSON is invalid";
  }

  const templates: Array<{ label: string; keyHint: string; value: any }> = [
    {
      label: "Page Blocks",
      keyHint: "page.home",
      value: {
        blocks: [
          { type: "text", as: "h2", text: "Section title" },
          { type: "text", as: "p", text: "Write your story here…" },
          { type: "image", src: "https://", alt: "" }
        ]
      }
    },
    {
      label: "Story (Text)",
      keyHint: "page.about",
      value: {
        blocks: [
          { type: "text", as: "h2", text: "Our story" },
          { type: "text", as: "p", text: "Add your story paragraph…" }
        ]
      }
    },
    {
      label: "Image",
      keyHint: "page.home",
      value: {
        blocks: [{ type: "image", src: "https://", alt: "" }]
      }
    },
    {
      label: "HTML",
      keyHint: "page.services",
      value: {
        blocks: [{ type: "html", html: "<h2>Title</h2><p>Your content…</p>" }]
      }
    }
  ];

  return (
    <AdminShell title="Content">
      <Seo title="Admin Content" description="Manage site content." path="/admin/content" />

      <div className="mb-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg p-6">
        <div className="text-sm text-white/70">CMS</div>
        <div className="text-2xl md:text-3xl font-bold font-poppins">Site content</div>
        <div className="mt-1 text-sm text-white/70">Use keys like <span className="font-mono">page.home</span>, <span className="font-mono">page.about</span>, etc.</div>
      </div>

      {error ? <div className="mb-4 rounded-xl border border-rose-200/30 bg-rose-500/10 px-4 py-3 text-rose-100">{error}</div> : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-lg font-bold font-poppins">Editor</div>
              <div className="text-sm text-white/70">Upsert <span className="font-mono">site_content</span> by key.</div>
            </div>
            {loading ? <div className="text-sm text-white/70">Loading…</div> : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => {
                  if (!draftKey.trim()) setDraftKey(t.keyHint);
                  setDraftValue(JSON.stringify(t.value, null, 2));
                }}
                className="min-h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-semibold hover:bg-white/15"
              >
                {t.label}
              </button>
            ))}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              aria-label="Upload image"
              title="Upload image"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                onPickImage(file);
              }}
            />

            <button
              type="button"
              disabled={uploading || loading}
              onClick={() => fileInputRef.current?.click()}
              className={
                "min-h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-semibold hover:bg-white/15 " +
                (uploading || loading ? "opacity-70 cursor-not-allowed" : "")
              }
            >
              {uploading ? "Uploading…" : "Upload image"}
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            <div>
              <label className="block text-sm font-semibold text-white/80 mb-1">Key</label>
              <input
                className="w-full min-h-11 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50"
                value={draftKey}
                onChange={(e) => setDraftKey(e.target.value)}
                placeholder="page.home"
              />
            </div>
            <div>
              <label htmlFor="contentValue" className="block text-sm font-semibold text-white/80 mb-1">Value (JSON)</label>
              <textarea
                id="contentValue"
                className="w-full min-h-56 rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                placeholder='{"blocks":[]}'
              />
              {draftParseError ? <div className="mt-2 text-xs text-rose-200">{draftParseError}</div> : null}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={save}
                disabled={loading}
                className={
                  "min-h-11 rounded-xl bg-white text-gray-900 px-4 text-sm font-bold hover:bg-white/90 " +
                  (loading ? "opacity-70 cursor-not-allowed" : "")
                }
              >
                Save
              </button>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className={
                  "min-h-11 rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold hover:bg-white/15 " +
                  (loading ? "opacity-70 cursor-not-allowed" : "")
                }
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg p-4 sm:p-6">
          <div className="text-lg font-bold font-poppins">Preview</div>
          <div className="mt-1 text-sm text-white/70">Renders the current draft if it matches the blocks format.</div>

          <div className="mt-5 rounded-2xl bg-white p-6 border border-white/20">
            {parsedDraft && !draftParseError ? <CmsBlocksRenderer value={parsedDraft} /> : <div className="text-sm text-gray-600">Enter valid JSON to preview.</div>}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg p-4 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-lg font-bold font-poppins">All keys</div>
            <div className="text-sm text-white/70">Click a row to load it into the editor.</div>
          </div>
        </div>

        <div className="mt-4 overflow-auto rounded-2xl border border-white/10 bg-white/5">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="text-left px-4 py-3">Key</th>
                <th className="text-left px-4 py-3">Updated</th>
                <th className="text-left px-4 py-3">Value</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-white/70" colSpan={4}>
                    No content found.
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.key} className="border-t border-white/10">
                    <td className="px-4 py-3 font-semibold text-white">{it.key}</td>
                    <td className="px-4 py-3 text-white/70 whitespace-nowrap">
                      {it.updated_at ? new Date(it.updated_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <pre className="text-xs text-white/80 whitespace-pre-wrap">{JSON.stringify(it.value, null, 2)}</pre>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setDraftKey(it.key);
                          setDraftValue(JSON.stringify(it.value ?? {}, null, 2));
                        }}
                        className="min-h-10 rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-semibold hover:bg-white/15"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
