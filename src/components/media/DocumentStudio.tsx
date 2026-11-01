// gn-apex/src/components/media/DocumentStudio.tsx
// Document workbench: a paper-style preview (native PDF viewer, text and CSV
// table, or a typed card for Office files) beside Details, Optimize and Protect.

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Info,
  SlidersHorizontal,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  FileIcon,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  X,
} from "lucide-react";
import {
  Stage,
  StudioTabs,
  type StudioTabDef,
  Group,
  Seg,
  Toggle,
  Note,
  KV,
  Chip,
  IconBtn,
  TextIn,
  Sel,
  fmtBytes,
  useEditHistory,
} from "./studioControls";
import { defaultDocEdits, type DocEdits } from "./studioEdits";

export interface DocumentStudioProps {
  file: File;
  url: string;
  initialEdits?: DocEdits | null;
  onEditsChange?: (e: DocEdits) => void;
}

type DocType = "pdf" | "sheet" | "word" | "text" | "other";
const typeOf = (n: string): DocType => {
  const x = n.split(".").pop()?.toLowerCase() ?? "";
  if (x === "pdf") return "pdf";
  if (["csv", "xls", "xlsx"].includes(x)) return "sheet";
  if (["doc", "docx"].includes(x)) return "word";
  if (["txt", "md", "json"].includes(x)) return "text";
  return "other";
};

const STYLE: Record<
  DocType,
  { icon: typeof FileText; color: string; bg: string; label: string }
> = {
  pdf: {
    icon: FileText,
    color: "text-red-400",
    bg: "bg-red-400/10",
    label: "PDF document",
  },
  sheet: {
    icon: FileSpreadsheet,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    label: "Spreadsheet",
  },
  word: {
    icon: FileText,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    label: "Word document",
  },
  text: {
    icon: FileText,
    color: "text-slate-300",
    bg: "bg-slate-400/10",
    label: "Text file",
  },
  other: {
    icon: FileIcon,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    label: "File",
  },
};

function parseCsv(t: string, rows = 60): string[][] {
  const out: string[][] = [];
  let row: string[] = [],
    cur = "",
    q = false;
  for (let i = 0; i < t.length && out.length < rows; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === "," || c === ";" || c === "\t") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur.replace(/\r$/, ""));
      out.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (row.length || cur) {
    row.push(cur);
    out.push(row);
  }
  return out;
}

// Panel width constraints for the splitter between preview and tools.
const MIN_PANEL_PX = 280;
const MAX_PANEL_PX = 640;
const DEFAULT_PANEL_PX = 368; // ≈ 23rem, matching the original layout

export function DocumentStudio({
  file,
  url,
  initialEdits,
  onEditsChange,
}: DocumentStudioProps) {
  const kind = typeOf(file.name);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const st = STYLE[kind];
  const Icon = st.icon;

  const [tab, setTab] = useState("details");
  const [ed, setEd] = useState<DocEdits>(
    () => initialEdits ?? defaultDocEdits(file.name),
  );
  const hist = useEditHistory(ed, setEd);
  const set = (p: Partial<DocEdits>) => setEd((s) => ({ ...s, ...p }));

  const cb = useRef(onEditsChange);
  useEffect(() => {
    cb.current = onEditsChange;
  });

  useEffect(() => {
    cb.current?.(ed);
  }, [ed]);

  const [zoom, setZoom] = useState(100);
  const [tagDraft, setTagDraft] = useState("");

  // ── Extracted content, keyed by file identity ────────────────────────────
  //
  // Storing the key ALONGSIDE the data lets us reset the derived values during
  // render (the React "derived state from props" pattern) instead of clearing
  // them synchronously inside an effect. That satisfies
  // react-hooks/set-state-in-effect and avoids a throwaway render of the
  // previous file's text.
  const fileKey = `${file.name}|${file.size}|${file.lastModified}`;
  const [extracted, setExtracted] = useState<{
    key: string;
    text: string | null;
    pages: number | null;
  }>(() => ({ key: fileKey, text: null, pages: null }));

  if (extracted.key !== fileKey) {
    setExtracted({ key: fileKey, text: null, pages: null });
  }

  useEffect(() => {
    let dead = false;
    if (kind === "text" || ext === "csv") {
      file
        .slice(0, 400_000)
        .text()
        .then((t) => {
          if (!dead)
            setExtracted((s) => (s.key === fileKey ? { ...s, text: t } : s));
        })
        .catch(() => {});
    }
    if (kind === "pdf") {
      file
        .slice(0, 20_000_000)
        .arrayBuffer()
        .then((b) => {
          if (dead) return;
          const s = new TextDecoder("latin1").decode(b);
          const count = (s.match(/\/Type\s*\/Page[^s]/g) ?? []).length || null;
          setExtracted((prev) =>
            prev.key === fileKey ? { ...prev, pages: count } : prev,
          );
        })
        .catch(() => {});
    }
    return () => {
      dead = true;
    };
  }, [file, kind, ext, fileKey]);

  const text = extracted.text;
  const pages = extracted.pages;

  const table = useMemo(
    () => (ext === "csv" && text ? parseCsv(text) : null),
    [ext, text],
  );

  const stats = useMemo(() => {
    if (!text) return null;
    const lines = text.split("\n").length;
    return {
      lines,
      words: text.trim() ? text.trim().split(/\s+/).length : 0,
      cols: table?.[0]?.length ?? 0,
    };
  }, [text, table]);

  const k = ed.compress
    ? { screen: 0.32, balanced: 0.52, print: 0.78 }[ed.quality]
    : 1;
  const estimate = Math.round(
    file.size *
      k *
      (ed.strip ? 0.98 : 1) *
      (kind === "pdf" ? 1 : kind === "sheet" || kind === "text" ? 0.9 : 0.85),
  );

  const addTag = () => {
    const t = tagDraft.trim().toLowerCase();
    if (t && !ed.tags.includes(t) && ed.tags.length < 8) {
      set({ tags: [...ed.tags, t] });
    }
    setTagDraft("");
  };

  const tabs: StudioTabDef[] = [
    { id: "details", label: "Details", icon: <Info size={15} /> },
    {
      id: "optimize",
      label: "Optimize",
      icon: <SlidersHorizontal size={15} />,
    },
    { id: "protect", label: "Protect", icon: <ShieldCheck size={15} /> },
  ];

  const paper = "rounded-none bg-white text-neutral-900 shadow-2xl";

  // ── Resizable splitter between preview and tools panel ──────────────────
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_PX);
  const drag = useRef({
    active: false,
    startX: 0,
    startWidth: DEFAULT_PANEL_PX,
  });

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    drag.current = {
      active: true,
      startX: e.clientX,
      startWidth: panelWidth,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* older browsers */
    }
  };
  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    const delta = drag.current.startX - e.clientX;
    const next = Math.min(
      MAX_PANEL_PX,
      Math.max(MIN_PANEL_PX, drag.current.startWidth + delta),
    );
    setPanelWidth(next);
  };
  const onHandlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current.active = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const resetPanel = () => setPanelWidth(DEFAULT_PANEL_PX);

  // ── Zoom transport helpers ─────────────────────────────────────────────
  const zoomOut = () => setZoom((z) => Math.max(50, z - 10));
  const zoomIn = () => setZoom((z) => Math.min(200, z + 10));

  return (
    <div
      className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_var(--panel-w)]"
      style={{ ["--panel-w"]: `${panelWidth}px` } as React.CSSProperties}
    >
      {/* ── LEFT COLUMN: Stage Playground + Zoom Transport Bar ── */}
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-neutral-950">
        <Stage className="relative flex-1 min-h-0 min-w-0 overflow-hidden p-3 lg:p-5">
          {/*
            Every preview sits inside the SAME wrapper. That wrapper is
            constrained by size-full + min-w-0 + overflow-hidden, so nothing
            inside can push past the column's provisioned width and trigger
            a horizontal scrollbar on the page itself.
          */}
          <div className="relative flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden @container-[size]">
            {kind === "pdf" ? (
              <div className="flex h-full w-full min-h-0 min-w-0 items-center justify-center">
                <iframe
                  title={file.name}
                  src={`${url}#toolbar=0&navpanes=0&view=FitH&zoom=${zoom}`}
                  className={`h-full w-full max-w-full max-h-full border-0 ${paper}`}
                />
              </div>
            ) : table ? (
              <div
                className={`h-full w-full max-w-full max-h-full min-w-0 min-h-0 overflow-auto ${paper} [scrollbar-width:thin]`}
                style={{ fontSize: `${(zoom / 100) * 12}px` }}
              >
                <table className="w-full border-collapse font-mono text-left">
                  <tbody>
                    {table.map((r, i) => (
                      <tr
                        key={i}
                        className={
                          i === 0
                            ? "bg-emerald-50 font-semibold"
                            : i % 2
                              ? "bg-neutral-50"
                              : ""
                        }
                      >
                        <td className="w-8 border-r border-neutral-200 px-2 py-1 text-right text-neutral-400">
                          {i + 1}
                        </td>
                        {r.map((c, j) => (
                          <td
                            key={j}
                            className="max-w-48 truncate border-r border-neutral-100 px-2 py-1"
                          >
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : text !== null ? (
              <pre
                className={`h-full w-full max-w-full max-h-full min-w-0 min-h-0 overflow-y-auto overflow-x-hidden whitespace-pre-wrap wrap-break-word p-6 sm:p-8 font-mono ${paper} [scrollbar-width:thin]`}
                style={{ fontSize: `${(zoom / 100) * 12}px` }}
              >
                {text.slice(0, 20000)}
              </pre>
            ) : (
              <div className="flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden p-2 sm:p-4">
                {/*
                  Treat the preview as an A4 sheet (210 × 297). At 100% it
                  fits the available stage width and height; zoom is applied
                  inside a clipped viewport so it can never widen the stage.
                */}
                <div className="relative flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden">
                  <div
                    className={`relative flex h-full max-h-full w-auto max-w-full shrink-0 flex-col overflow-hidden transition-transform duration-150 ${paper}`}
                    style={{
                      aspectRatio: "210 / 297",
                      width: "min(100cqw, 70.707cqh)",
                      maxWidth: "100%",
                      maxHeight: "100%",
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "center center",
                    }}
                  >
                    <div
                      className={`flex items-center gap-2 px-4 py-3 ${st.bg}`}
                    >
                      <Icon size={18} className={st.color} />
                      <span className="text-xs font-semibold">{st.label}</span>
                    </div>
                    <div className="flex-1 space-y-2 p-5">
                      <div className="h-3 w-2/3 rounded bg-neutral-200" />
                      {[90, 100, 84, 96, 70, 100, 88, 60].map((w, i) => (
                        <div
                          key={i}
                          className="h-2 rounded bg-neutral-100"
                          style={{ width: `${w}%` }}
                        />
                      ))}
                    </div>
                    <p className="border-t p-3 text-center text-[10px] text-neutral-500">
                      Office files are previewed by type here and processed on
                      the server.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {ed.watermark && ed.watermarkText && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden">
                <span className="-rotate-30 select-none whitespace-nowrap text-5xl font-black uppercase tracking-widest text-neutral-500/25">
                  {ed.watermarkText}
                </span>
              </div>
            )}

            <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
              <Chip>
                <Icon size={12} className={st.color} />
                {ext.toUpperCase()}
              </Chip>
              {pages && (
                <Chip>
                  ~{pages} page{pages > 1 ? "s" : ""}
                </Chip>
              )}
              {table && <Chip>{table[0]?.length ?? 0} columns</Chip>}
            </div>
          </div>
        </Stage>

        {/* ── BOTTOM CONTROLS BAR ── */}
        <div className="flex shrink-0 items-center gap-1 border-t border-white/8 bg-black/40 px-4 py-2">
          <IconBtn label="Undo" onClick={hist.undo} disabled={!hist.canUndo}>
            <Undo2 size={15} />
          </IconBtn>
          <IconBtn label="Redo" onClick={hist.redo} disabled={!hist.canRedo}>
            <Redo2 size={15} />
          </IconBtn>
          <span className="ml-3 truncate text-xs text-muted-foreground">
            {file.name}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <IconBtn label="Zoom out" onClick={zoomOut} disabled={zoom <= 50}>
              <ZoomOut size={15} />
            </IconBtn>
            <button
              type="button"
              onClick={() => setZoom(100)}
              title="Reset zoom to 100%"
              className="w-12 rounded-md text-center font-mono text-[11px] text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              {zoom}%
            </button>
            <IconBtn label="Zoom in" onClick={zoomIn} disabled={zoom >= 200}>
              <ZoomIn size={15} />
            </IconBtn>
          </div>
        </div>
      </div>

      {/* ── RIGHT COLUMN: Inspector Tools (Scrollable, Resizable) ── */}
      <aside className="relative flex h-full min-h-0 flex-col overflow-hidden border-t border-muted-foreground/15 bg-muted lg:border-l lg:border-t-0">
        {/* Drag handle pinned to the panel's left edge (lg only) */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize tools panel"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          onDoubleClick={resetPanel}
          className="group absolute left-0 top-0 bottom-0 z-30 hidden w-2 cursor-col-resize touch-none items-center justify-center lg:flex"
        >
          <div className="h-10 w-1 rounded-full bg-white/10 transition-colors group-hover:bg-primary/60 group-active:bg-primary" />
        </div>

        <StudioTabs tabs={tabs} active={tab} onChange={setTab} />
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 [scrollbar-width:thin]">
          {tab === "details" && (
            <>
              <Group title="Label">
                <TextIn
                  label="Display name"
                  value={ed.displayName}
                  onChange={(v) => set({ displayName: v })}
                />
                <TextIn
                  label="Description"
                  multiline
                  value={ed.description}
                  onChange={(v) => set({ description: v })}
                  placeholder="What is this file for?"
                />
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ed.tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px]"
                      >
                        {t}
                        <button
                          aria-label={`Remove ${t}`}
                          onClick={() =>
                            set({ tags: ed.tags.filter((x) => x !== t) })
                          }
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addTag())
                    }
                    placeholder="Type a tag, press Enter"
                    className="h-9 w-full rounded-lg border border-white/10 bg-black/20 px-2.5 text-xs focus:border-primary/40 focus:outline-none"
                  />
                </div>
              </Group>
              <Group title="File">
                <KV
                  rows={[
                    ["Name", file.name],
                    ["Type", file.type || ext.toUpperCase()],
                    ["Size", fmtBytes(file.size)],
                    ...(pages
                      ? [["Pages", `~${pages}`] as [string, string]]
                      : []),
                    ...(stats
                      ? ([
                          ["Lines", String(stats.lines)],
                          ["Words", String(stats.words)],
                        ] as [string, string][])
                      : []),
                    ...(table
                      ? ([["Columns", String(stats?.cols ?? 0)]] as [
                          string,
                          string,
                        ][])
                      : []),
                    [
                      "Modified",
                      new Date(file.lastModified).toLocaleDateString(),
                    ],
                  ]}
                />
              </Group>
            </>
          )}
          {tab === "optimize" && (
            <>
              <Group title="Size">
                <Toggle
                  label="Compress"
                  sub={
                    kind === "pdf"
                      ? "Re-encode embedded images"
                      : "Pack the file tighter"
                  }
                  checked={ed.compress}
                  onChange={(v) => set({ compress: v })}
                />
                {ed.compress && (
                  <Seg
                    value={ed.quality}
                    options={[
                      { value: "screen", label: "Small" },
                      { value: "balanced", label: "Balanced" },
                      { value: "print", label: "Sharp" },
                    ]}
                    onChange={(v) => set({ quality: v })}
                  />
                )}
                {kind === "pdf" && (
                  <Toggle
                    label="Fast web view"
                    sub="Pages start showing before the file finishes loading"
                    checked={ed.linearize}
                    onChange={(v) => set({ linearize: v })}
                  />
                )}
              </Group>
              <Group title="Clean up">
                <Toggle
                  label="Remove metadata"
                  sub="Author, edit history, GPS"
                  checked={ed.strip}
                  onChange={(v) => set({ strip: v })}
                />
                {(kind === "pdf" || kind === "word") && (
                  <Toggle
                    label="Flatten forms and layers"
                    checked={ed.flatten}
                    onChange={(v) => set({ flatten: v })}
                  />
                )}
                {kind === "pdf" && (
                  <Toggle
                    label="Make scanned pages searchable"
                    sub="Runs OCR on image-only pages"
                    checked={ed.ocr}
                    onChange={(v) => set({ ocr: v })}
                  />
                )}
              </Group>
              {kind === "sheet" && (
                <Group title="Data">
                  <Toggle
                    label="Trim cell whitespace"
                    checked={ed.csvTrim}
                    onChange={(v) => set({ csvTrim: v })}
                  />
                  <Toggle
                    label="Drop empty rows"
                    checked={ed.csvDropEmpty}
                    onChange={(v) => set({ csvDropEmpty: v })}
                  />
                  <Toggle
                    label="Convert to UTF-8"
                    checked={ed.csvUtf8}
                    onChange={(v) => set({ csvUtf8: v })}
                  />
                </Group>
              )}
              <Group title="Result">
                <KV
                  rows={[
                    ["Original", fmtBytes(file.size)],
                    ["Estimated size", fmtBytes(estimate)],
                    [
                      "Saved",
                      `${Math.max(
                        0,
                        Math.round((1 - estimate / (file.size || 1)) * 100),
                      )}%`,
                    ],
                  ]}
                />
              </Group>
            </>
          )}
          {tab === "protect" && (
            <>
              <Group title="Access">
                <Seg
                  value={ed.visibility}
                  options={[
                    { value: "private", label: "Private" },
                    { value: "team", label: "Team" },
                    { value: "public", label: "Public" },
                  ]}
                  onChange={(v) => set({ visibility: v })}
                />
                <Note>
                  Who can open this file after it is saved. You can change it
                  later.
                </Note>
                <Toggle
                  label="Allow download"
                  checked={ed.allowDownload}
                  onChange={(v) => set({ allowDownload: v })}
                />
                <Sel
                  label="Link expires"
                  value={String(ed.expiryDays)}
                  options={[
                    [0, "Never"],
                    [1, "After 1 day"],
                    [7, "After 7 days"],
                    [30, "After 30 days"],
                  ].map(([v, l]) => ({ value: String(v), label: String(l) }))}
                  onChange={(v) => set({ expiryDays: +v })}
                />
              </Group>
              <Group
                title="Watermark"
                gated={{
                  on: ed.watermark,
                  onToggle: (v) => set({ watermark: v }),
                }}
              >
                <TextIn
                  label="Text"
                  value={ed.watermarkText}
                  onChange={(v) => set({ watermarkText: v })}
                />
                <Note>
                  The watermark is stamped on every page when the file is
                  processed.
                </Note>
              </Group>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
