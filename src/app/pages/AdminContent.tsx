import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { AdminShell } from "../components/admin/AdminShell";
import { CmsBlocksRenderer } from "../components/cms/CmsBlocks";
import {
  createAdminAssetUploadUrl,
  fetchAdminContent,
  upsertAdminContent,
} from "../services/platformService";
import { uploadFileToSignedUrl } from "../services/careersService";

// Block types
type TextBlock  = { type: "text";  as: "h2" | "h3" | "p"; text: string };
type ImageBlock = { type: "image"; src: string; alt: string };
type HtmlBlock  = { type: "html";  html: string };
type Block = TextBlock | ImageBlock | HtmlBlock;

const newTextBlock    = (): TextBlock  => ({ type: "text",  as: "p",  text: "" });
const newHeadingBlock = (): TextBlock  => ({ type: "text",  as: "h2", text: "" });
const newImageBlock   = (): ImageBlock => ({ type: "image", src: "",  alt: "" });
const newHtmlBlock    = (): HtmlBlock  => ({ type: "html",  html: "" });

function blocksToValue(blocks: Block[]) { return { blocks }; }
function valueToBlocks(value: unknown): Block[] {
  if (!value || typeof value !== "object") return [];
  const v = value as any;
  if (!Array.isArray(v.blocks)) return [];
  return v.blocks.filter(Boolean);
}

function BlockCard({
  block, index, total, onChange, onDelete, onMove, onUploadImage, uploadingIdx,
}: {
  block: Block; index: number; total: number;
  onChange: (b: Block) => void; onDelete: () => void; onMove: (dir: -1 | 1) => void;
  onUploadImage: (idx: number, file: File) => void; uploadingIdx: number | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isUploading = uploadingIdx === index;
  const typeLabel =
    block.type === "image" ? "Image" :
    block.type === "html"  ? "HTML" :
    block.as === "h2" || block.as === "h3" ? "Heading" : "Paragraph";
  const typeBadgeColor: Record<string, string> = {
    Image: "bg-violet-100 text-violet-700",
    HTML:  "bg-amber-100 text-amber-700",
    Heading: "bg-blue-100 text-blue-700",
    Paragraph: "bg-gray-100 text-gray-700",
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeBadgeColor[typeLabel]}`}>{typeLabel}</span>
        <span className="text-xs text-gray-400 ml-auto">Block {index + 1}</span>
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} title="Move up"
          className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/></svg>
        </button>
        <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} title="Move down"
          className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </button>
        <button type="button" onClick={onDelete} title="Remove block"
          className="p-1.5 rounded-lg hover:bg-rose-100 transition-colors">
          <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div className="p-4 grid gap-3">
        {block.type === "text" && (
          <>
            <div className="flex gap-2">
              {(["p","h2","h3"] as const).map((t) => (
                <button key={t} type="button" onClick={() => onChange({ ...block, as: t })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    block.as === t ? "bg-blue-600 border-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t === "p" ? "Paragraph" : t === "h2" ? "Heading 2" : "Heading 3"}
                </button>
              ))}
            </div>
            <textarea rows={block.as === "p" ? 4 : 2} value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
              placeholder={block.as === "p" ? "Write your paragraph here\u2026" : "Write your heading\u2026"}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 resize-none"
            />
          </>
        )}

        {block.type === "image" && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { onUploadImage(index, f); e.target.value = ""; } }}
            />
            {block.src ? (
              <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <img src={block.src} alt={block.alt} className="max-h-48 w-full object-contain" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="px-3 py-2 rounded-lg bg-white text-xs font-semibold text-gray-900 hover:bg-gray-100">Replace</button>
                  <button type="button" onClick={() => onChange({ ...block, src: "" })}
                    className="px-3 py-2 rounded-lg bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700">Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" disabled={isUploading} onClick={() => fileRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-colors disabled:opacity-60">
                {isUploading
                  ? <svg className="animate-spin w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                  : <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                }
                <span className="text-xs font-semibold text-gray-500">{isUploading ? "Uploading\u2026" : "Click to upload image"}</span>
                <span className="text-xs text-gray-400">PNG, JPG, GIF, WebP</span>
              </button>
            )}
            <input value={block.alt} onChange={(e) => onChange({ ...block, alt: e.target.value })}
              placeholder="Alt text (e.g. 'Team photo')"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
            />
          </>
        )}

        {block.type === "html" && (
          <>
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Use only safe, trusted HTML.
            </div>
            <textarea rows={6} value={block.html} onChange={(e) => onChange({ ...block, html: e.target.value })}
              placeholder="<h2>Title</h2><p>Your content\u2026</p>" spellCheck={false}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30 resize-none"
            />
          </>
        )}
      </div>
    </motion.div>
  );
}

export function AdminContent() {
  const { isAuthed, role } = useAuth();

  const [items, setItems] = useState<Array<{ key: string; value: unknown; updated_at: string }>>([]);
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle"|"saving"|"saved"|"error">("idle");

  const [contentKey, setContentKey] = useState("");
  const [blocks, setBlocks]         = useState<Block[]>([]);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview]   = useState(false);

  function load() {
    if (!isAuthed) return;
    setError(null); setLoading(true);
    fetchAdminContent()
      .then((r: any) => setItems(r.items))
      .catch((e: any) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isAuthed || role !== "admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed, role]);

  function addBlock(factory: () => Block) { setBlocks((p) => [...p, factory()]); }
  function updateBlock(idx: number, b: Block) { setBlocks((p) => p.map((x,i) => i===idx ? b : x)); }
  function deleteBlock(idx: number)           { setBlocks((p) => p.filter((_,i) => i!==idx)); }
  function moveBlock(idx: number, dir: -1|1) {
    setBlocks((p) => {
      const n = [...p]; const t = idx+dir;
      if (t < 0 || t >= n.length) return p;
      [n[idx], n[t]] = [n[t], n[idx]]; return n;
    });
  }

  async function handleImageUpload(idx: number, file: File) {
    setError(null); setUploadingIdx(idx);
    try {
      const r = await createAdminAssetUploadUrl({ fileName: file.name, fileType: file.type||"application/octet-stream", fileSize: file.size });
      await uploadFileToSignedUrl(r.signedUrl, file);
      updateBlock(idx, { type: "image", src: r.publicUrl, alt: "" });
    } catch (e: any) { setError(e?.message ?? "Image upload failed"); }
    finally { setUploadingIdx(null); }
  }

  async function save() {
    const key = contentKey.trim();
    if (!key) { setError("Please enter a content key (e.g. page.home)"); return; }
    setError(null); setSaveStatus("saving");
    try {
      await upsertAdminContent({ key, value: blocksToValue(blocks) });
      setSaveStatus("saved"); setTimeout(() => setSaveStatus("idle"), 2500); load();
    } catch (e: any) { setError(e?.message ?? "Failed to save"); setSaveStatus("error"); }
  }

  function openKey(item: { key: string; value: unknown }) {
    setContentKey(item.key); setBlocks(valueToBlocks(item.value));
    setError(null); setSaveStatus("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function newContent() { setContentKey(""); setBlocks([]); setError(null); setSaveStatus("idle"); }

  if (!isAuthed || role !== "admin") return <div className="p-10 text-center">Access Denied</div>;

  const isDirty = blocks.length > 0 || contentKey.trim() !== "";

  return (
    <AdminShell title="Content">
      <Seo title="Admin Content" description="Manage site content." path="/admin/content" />

      {/* Header */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm p-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm text-gray-500 font-medium">Content Manager</div>
          <div className="text-2xl md:text-3xl font-bold font-poppins mt-0.5">Site Content</div>
          <div className="mt-1 text-sm text-gray-500">Build page content visually \u2014 no coding needed.</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={newContent}
            className="min-h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold hover:bg-gray-50 transition-colors">+ New</button>
          <button type="button" onClick={() => setShowPreview((v) => !v)}
            className={`min-h-10 rounded-xl border px-4 text-sm font-semibold transition-colors lg:hidden ${showPreview ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"}`}>
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-rose-400 hover:text-rose-700">\u2715</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Editor column */}
        <div className="grid gap-5">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
            <label className="block text-sm font-bold text-gray-800 mb-1">
              Content Key
              <span className="ml-2 text-xs font-normal text-gray-400">e.g. page.home, page.about</span>
            </label>
            <input
              className="w-full min-h-11 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/30"
              value={contentKey} onChange={(e) => setContentKey(e.target.value)} placeholder="page.home"
            />
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button type="button" onClick={save} disabled={saveStatus === "saving" || !isDirty}
                className={`min-h-11 rounded-xl px-5 text-sm font-bold text-white transition-all ${
                  saveStatus === "saving" ? "bg-blue-400 cursor-not-allowed" :
                  saveStatus === "saved"  ? "bg-emerald-500" :
                  saveStatus === "error"  ? "bg-rose-500" :
                  "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                } disabled:opacity-50`}>
                {saveStatus === "saving" ? "Saving\u2026" : saveStatus === "saved" ? "\u2713 Saved!" : saveStatus === "error" ? "Error \u2013 retry" : "Save Content"}
              </button>
              <button type="button" onClick={load} disabled={loading}
                className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50">
                {loading ? "Loading\u2026" : "Refresh"}
              </button>
              {isDirty && (
                <button type="button" onClick={newContent}
                  className="min-h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold hover:bg-gray-50 text-gray-500 transition-colors">Discard</button>
              )}
            </div>
          </div>

          {/* Blocks */}
          <div className="grid gap-3">
            <AnimatePresence initial={false}>
              {blocks.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/></svg>
                  <p className="text-sm font-semibold">No blocks yet</p>
                  <p className="text-xs">Add a block below to start building</p>
                </motion.div>
              )}
              {blocks.map((block, idx) => (
                <BlockCard key={idx} block={block} index={idx} total={blocks.length}
                  onChange={(b) => updateBlock(idx, b)} onDelete={() => deleteBlock(idx)}
                  onMove={(dir) => moveBlock(idx, dir)} onUploadImage={handleImageUpload} uploadingIdx={uploadingIdx}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Add block */}
          <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Add Block</p>
            <div className="flex flex-wrap gap-2">
              {([
                { label: "+ Paragraph", factory: newTextBlock,    color: "hover:border-gray-400 hover:bg-white" },
                { label: "+ Heading",   factory: newHeadingBlock,  color: "hover:border-blue-400 hover:bg-blue-50" },
                { label: "+ Image",     factory: newImageBlock,    color: "hover:border-violet-400 hover:bg-violet-50" },
                { label: "+ HTML",      factory: newHtmlBlock,     color: "hover:border-amber-400 hover:bg-amber-50" },
              ] as { label: string; factory: () => Block; color: string }[]).map(({ label, factory, color }) => (
                <button key={label} type="button" onClick={() => addBlock(factory)}
                  className={`min-h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold transition-colors ${color}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Preview column */}
        <div className={`lg:block ${showPreview ? "block" : "hidden"}`}>
          <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">Live Preview</p>
                <p className="text-xs text-gray-500 mt-0.5">Updates as you type</p>
              </div>
              {contentKey && <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">{contentKey}</span>}
            </div>
            <div className="p-5 min-h-40">
              {blocks.length > 0 ? (
                <CmsBlocksRenderer value={blocksToValue(blocks)} />
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
                  <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/></svg>
                  <p className="text-sm">Preview will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Saved keys */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div>
            <h2 className="text-lg font-bold font-poppins">Saved Content</h2>
            <p className="text-sm text-gray-500">Click any card to edit it.</p>
          </div>
          {loading && <span className="text-sm text-gray-500">Loading\u2026</span>}
        </div>

        {items.length === 0 && !loading ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white py-12 text-center text-gray-400">
            <p className="text-sm font-semibold">No saved content yet</p>
            <p className="text-xs mt-1">Save your first block above to see it here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((it) => {
              const blockCount = valueToBlocks(it.value).length;
              const blockTypes = [...new Set(valueToBlocks(it.value).map((b) => b.type))];
              return (
                <motion.button key={it.key} type="button" onClick={() => openKey(it)}
                  whileHover={{ y: -2 }} transition={{ duration: 0.15 }}
                  className={`text-left rounded-2xl border bg-white shadow-sm p-5 hover:border-blue-300 hover:shadow-md transition-all group ${
                    contentKey === it.key ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 font-mono text-sm truncate">{it.key}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {blockCount} block{blockCount !== 1 ? "s" : ""}
                        {blockTypes.length > 0 && <span className="ml-2 text-gray-400">({blockTypes.join(", ")})</span>}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 mt-0.5 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </div>
                  <p className="mt-3 text-xs text-gray-400">
                    Updated {it.updated_at ? new Date(it.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "\u2014"}
                  </p>
                  {contentKey === it.key && (
                    <span className="inline-block mt-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Currently editing</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
