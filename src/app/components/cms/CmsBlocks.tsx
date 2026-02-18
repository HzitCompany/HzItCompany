import { useEffect, useMemo, useState } from "react";
import { fetchPublicContent } from "../../services/platformService";

export type CmsBlock =
  | { type: "text"; as?: "h2" | "h3" | "p"; text: string }
  | { type: "image"; src: string; alt?: string; href?: string }
  | { type: "html"; html: string };

export type CmsBlocksValue = { blocks: CmsBlock[] };

function isBlocksValue(value: unknown): value is CmsBlocksValue {
  if (!value || typeof value !== "object") return false;
  const anyValue = value as any;
  return Array.isArray(anyValue.blocks);
}

export function CmsBlocksRenderer({ value }: { value: unknown }) {
  const blocks: CmsBlock[] = useMemo(() => {
    if (!isBlocksValue(value)) return [];
    return (value.blocks ?? []).filter(Boolean);
  }, [value]);

  if (!blocks.length) return null;

  return (
    <div className="grid gap-4">
      {blocks.map((b, idx) => {
        if (!b || typeof b !== "object") return null;

        if (b.type === "text") {
          const Tag = (b.as ?? "p") as any;
          const cls =
            Tag === "h2"
              ? "text-2xl md:text-3xl font-bold font-poppins text-gray-900"
              : Tag === "h3"
                ? "text-xl font-bold font-poppins text-gray-900"
                : "text-gray-700 leading-relaxed";
          return (
            <Tag key={idx} className={cls}>
              {b.text}
            </Tag>
          );
        }

        if (b.type === "image") {
          const img = (
            <img
              src={b.src}
              alt={b.alt ?? ""}
              className="w-full max-w-3xl rounded-2xl border border-gray-200"
              loading="lazy"
            />
          );
          return (
            <div key={idx}>
              {b.href ? (
                <a href={b.href} target="_blank" rel="noreferrer" className="inline-block">
                  {img}
                </a>
              ) : (
                img
              )}
            </div>
          );
        }

        if (b.type === "html") {
          return (
            <div
              key={idx}
              className="prose max-w-none prose-headings:font-poppins"
              // Admin-controlled content.
              dangerouslySetInnerHTML={{ __html: b.html }}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

export function CmsSlot({ contentKey }: { contentKey: string }) {
  const [value, setValue] = useState<unknown>(null);

  useEffect(() => {
    fetchPublicContent([contentKey])
      .then((r) => {
        const row = r.items.find((it) => it.key === contentKey);
        setValue(row?.value ?? null);
      })
      .catch(() => {
        // Non-blocking: if API is down/cold-starting, just hide the slot.
        setValue(null);
      });
  }, [contentKey]);

  if (!value) return null;
  if (!isBlocksValue(value) || !value.blocks.length) return null;

  return (
    <section className="py-16 bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 sm:p-10 border border-gray-200">
          <CmsBlocksRenderer value={value} />
        </div>
      </div>
    </section>
  );
}
