import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Pencil, X, Save, ChevronDown, ChevronUp } from "lucide-react";

import { Seo } from "../components/Seo";
import { useAuth } from "../auth/AuthProvider";
import { fetchMySubmissions, updateSubmission, type SubmissionItem } from "../services/submissionsService";
import { CmsSlot } from "../components/cms/CmsBlocks";

function formatDate(d: string) {
  const dt = new Date(d);
  if (!Number.isFinite(dt.getTime())) return d;
  return dt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function formatStatus(status?: string | null) {
  if (!status) return null;
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusColor(status?: string | null) {
  switch (status) {
    case "reviewing": return "text-amber-700 bg-amber-50 border-amber-200";
    case "shortlisted": return "text-sky-700 bg-sky-50 border-sky-200";
    case "hired": return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "rejected": return "text-rose-700 bg-rose-50 border-rose-200";
    default: return "text-blue-700 bg-blue-50 border-blue-200";
  }
}

const EDIT_FIELDS: Record<
  string,
  Array<{ key: string; label: string; type?: "textarea" | "email" | "tel" | "url" }>
> = {
  contact: [
    { key: "name", label: "Your Name" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "message", label: "Message", type: "textarea" },
  ],
  hire: [
    { key: "name", label: "Full Name" },
    { key: "email", label: "Email", type: "email" },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "projectName", label: "Project Name" },
    { key: "projectDescription", label: "Project Description", type: "textarea" },
    { key: "personalMessage", label: "Personal Message", type: "textarea" },
    { key: "additionalNotes", label: "Additional Notes", type: "textarea" },
    { key: "referenceUrl", label: "Reference URL", type: "url" },
  ],
};

function EditForm({
  item,
  onClose,
  onSaved,
}: {
  item: SubmissionItem;
  onClose: () => void;
  onSaved: (updated: Record<string, string>) => void;
}) {
  const baseFields = EDIT_FIELDS[item.type] ?? [];
  const data = (item.data ?? {}) as Record<string, unknown>;

  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(baseFields.map(({ key }) => [key, String(data[key] ?? "")]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLElement | null>(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSubmission(item.id, fields as Record<string, unknown>);
      onSaved(fields);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (baseFields.length === 0) {
    return (
      <div className="px-6 pb-6 text-sm text-gray-500">
        Career applications cannot be edited here. Please{" "}
        <a href="/contact" className="text-blue-600 underline">contact us</a> directly.
        <button type="button" onClick={onClose} className="ml-3 text-gray-400 hover:text-gray-600">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="px-5 sm:px-6 pb-6 border-t border-gray-100 pt-4 bg-gray-50/40">
        <div className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wide">Edit Submission</div>
        {error ? (
          <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{error}</div>
        ) : null}
        <div className="space-y-4">
          {baseFields.map(({ key, label, type }, i) =>
            type === "textarea" ? (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all resize-y text-sm bg-white"
                  value={fields[key] ?? ""}
                  onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                  ref={i === 0 ? (el) => { firstRef.current = el; } : undefined}
                />
              </div>
            ) : (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type={type ?? "text"}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 outline-none transition-all text-sm bg-white"
                  value={fields[key] ?? ""}
                  onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
                  ref={i === 0 ? (el) => { firstRef.current = el; } : undefined}
                />
              </div>
            )
          )}
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-all"
          >
            <Save size={14} className="mr-1.5" />
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-100 transition-all"
          >
            <X size={14} className="mr-1.5" />
            Cancel
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function Submissions() {
  const { isAuthed, user } = useAuth();
  const [items, setItems] = useState<SubmissionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Always clear stale data first — prevents previous user's submissions
    // from showing while the new user's fetch is in progress.
    setItems([]);
    setFetchError(null);

    if (!isAuthed) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    fetchMySubmissions()
      .then((r) => { if (mounted) setItems(r.items ?? []); })
      .catch((e: any) => { if (mounted) setFetchError(e?.message ?? "Failed to load submissions"); })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [isAuthed, user?.id]);

  const handleSaved = (item: SubmissionItem, updatedFields: Record<string, string>) => {
    setItems((prev) =>
      prev.map((s) =>
        s.id === item.id ? { ...s, data: { ...(s.data as any), ...updatedFields } } : s
      )
    );
    setSavedIds((prev) => new Set(prev).add(item.id));
    setEditingId(null);
    setTimeout(
      () => setSavedIds((prev) => { const n = new Set(prev); n.delete(item.id); return n; }),
      3000
    );
  };

  const canEdit = (item: SubmissionItem) =>
    (item.type === "contact" || item.type === "hire") &&
    (!item.status || item.status === "new");

  return (
    <div className="min-h-screen">
      <Seo title="My Submissions" description="View and edit your recent submissions." path="/submissions" />

      {/* Hero */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-blue-900 via-blue-800 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ scale: [1.2, 1, 1.2], rotate: [90, 0, 90] }}
            transition={{ duration: 16, repeat: Infinity }}
            className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"
          />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 font-poppins">My Submissions</h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
              Contact, hire, and career requests you've sent. Edit open requests anytime.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl">
              {fetchError ? (
                <div className="p-6 text-sm text-rose-700 bg-rose-50 border-b border-rose-100">{fetchError}</div>
              ) : null}

              {loading ? (
                <div className="p-6 text-gray-500 text-sm">Loading your submissions...</div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-sm">No submissions yet.</p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
                    <a href="/contact" className="px-5 py-2.5 rounded-xl border border-blue-600 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-all">
                      Send a message
                    </a>
                    <a href="/hire-us" className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-all">
                      Hire us
                    </a>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const data = (item.data ?? {}) as any;
                    const isEditing = editingId === item.id;
                    const isExpanded = expandedId === item.id;
                    const justSaved = savedIds.has(item.id);
                    const editable = canEdit(item);

                    const title =
                      item.type === "contact"
                        ? data.subject || data.name || "Contact"
                        : item.type === "hire"
                          ? data.projectName || "Hire Us"
                          : data.role || "Career";

                    const subtitle =
                      item.type === "contact"
                        ? data.email
                        : item.type === "hire"
                          ? (Array.isArray(data.services)
                              ? data.services.slice(0, 2).join(", ")
                              : data.services || data.email)
                          : data.email;

                    const statusLabel = formatStatus(item.status);
                    const typeLabel = item.type === "hire" ? "Hire Us" : item.type === "contact" ? "Contact" : "Career";

                    return (
                      <div key={item.id} className="group">
                        {/* Summary row */}
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">{typeLabel}</span>
                                {statusLabel ? (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusColor(item.status)}`}>
                                    {statusLabel}
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-blue-700 bg-blue-50 border-blue-200">
                                    New
                                  </span>
                                )}
                                {justSaved ? (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
                                    Saved
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-gray-900 truncate">
                                {String(title || item.type)}
                              </div>
                              {subtitle ? (
                                <div className="mt-0.5 text-xs text-gray-500 truncate">{String(subtitle)}</div>
                              ) : null}
                              <div className="mt-0.5 text-xs text-gray-400">{formatDate(item.created_at)} #{item.id}</div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {editable && !isEditing ? (
                                <button
                                  type="button"
                                  onClick={() => { setEditingId(item.id); setExpandedId(null); }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-all"
                                >
                                  <Pencil size={12} />
                                  Edit
                                </button>
                              ) : null}
                              {isEditing ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-all"
                                >
                                  <X size={12} />
                                  Cancel
                                </button>
                              ) : null}
                              {!isEditing ? (
                                <button
                                  type="button"
                                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition-all"
                                >
                                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                  {isExpanded ? "Less" : "Details"}
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        {/* Expandable detail view */}
                        <AnimatePresence>
                          {isExpanded && !isEditing ? (
                            <motion.div
                              key="details"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 sm:px-6 pb-5 border-t border-gray-100 pt-4 bg-gray-50/60">
                                <div className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Submission Details</div>
                                <dl className="space-y-2">
                                  {Object.entries(data)
                                    .filter(([k]) => !["adminStatus", "honeypot"].includes(k))
                                    .map(([k, v]) => (
                                      <div key={k} className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                                        <dt className="font-medium text-gray-500 capitalize shrink-0">
                                          {k.replace(/([A-Z])/g, " $1")}
                                        </dt>
                                        <dd className="text-gray-800 break-words">
                                          {Array.isArray(v)
                                            ? v.join(", ")
                                            : typeof v === "object" && v
                                              ? JSON.stringify(v)
                                              : String(v ?? "")}
                                        </dd>
                                      </div>
                                    ))}
                                </dl>
                                {!editable && item.type !== "career" ? (
                                  <p className="mt-3 text-xs text-gray-400">
                                    This submission is under review and can no longer be edited.
                                  </p>
                                ) : null}
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>

                        {/* Inline edit form */}
                        <AnimatePresence>
                          {isEditing ? (
                            <EditForm
                              key="edit"
                              item={item}
                              onClose={() => setEditingId(null)}
                              onSaved={(fields) => handleSaved(item, fields)}
                            />
                          ) : null}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Admin-managed page blocks */}
      <CmsSlot contentKey="page.submissions" />
    </div>
  );
}