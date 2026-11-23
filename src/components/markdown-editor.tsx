"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, Copy, FileCode2, FileText, PanelRight, PanelRightClose,
} from "lucide-react";
import { useDocumentEditor, EditorToolbar, VisualEditor } from "./visual-editor";
import { renderMarkdown, renderSemanticHtml } from "@/lib/markdown";

type Draft = { title: string; slug: string; markdown: string; folderId: string | null };
type Folder = { id: string; name: string };
type Mode = "visual" | "markdown" | "html";

function textFromHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, " ").trim();
}

function relativeTime(value: string) {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function MarkdownEditor({ systemId, initial, folders, initialVersion }: {
  systemId: string;
  initial: Draft;
  folders?: Folder[];
  initialVersion: string;
}) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("visual");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [copied, setCopied] = useState<"slug" | "html" | "">("");
  const [lastSaved, setLastSaved] = useState(initialVersion);
  const [savedLabel, setSavedLabel] = useState("just now");
  const router = useRouter();
  const inFlight = useRef(false);
  const saveRef = useRef<() => void>(() => {});
  const version = useRef(initialVersion);
  const copyTimer = useRef<number | undefined>(undefined);

  const changed = (Object.keys(draft) as (keyof Draft)[]).some(key => draft[key] !== saved[key]);
  const html = useMemo(() => renderSemanticHtml(draft.markdown), [draft.markdown]);
  const text = useMemo(() => textFromHtml(renderMarkdown(draft.markdown)), [draft.markdown]);
  const words = text ? text.split(/\s+/).length : 0;
  const readingTime = words ? Math.max(1, Math.ceil(words / 225)) : 0;

  const { editor, issue } = useDocumentEditor({
    source: draft.markdown,
    onChange: value => change("markdown", value),
    active: mode === "visual",
  });

  useEffect(() => { setSavedLabel(relativeTime(lastSaved)); }, [lastSaved]);

  useEffect(() => {
    if (!changed) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [changed]);

  async function save() {
    if (inFlight.current || !changed) return;
    const snapshot = draft;
    const patch = Object.fromEntries((Object.keys(snapshot) as (keyof Draft)[])
      .filter(key => snapshot[key] !== saved[key]).map(key => [key, snapshot[key]]));
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/mcp/docs/" + systemId, {
        method: "PATCH", headers: { "Content-Type": "application/json", "X-Document-Version": version.current }, body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not save this document.");
      const next = { title: data.title, slug: data.slug, markdown: data.markdown, folderId: data.folderId } as Draft;
      version.current = data.updatedAt;
      setLastSaved(data.updatedAt);
      if (next.folderId !== saved.folderId) router.refresh();
      setSaved(next);
      setDraft(current => Object.fromEntries((Object.keys(next) as (keyof Draft)[]).map(key => [
        key, current[key] === snapshot[key] ? next[key] : current[key],
      ])) as Draft);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Could not save this document.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  saveRef.current = () => void save();

  useEffect(() => {
    if (!changed || busy || error || !draft.title.trim() || !draft.slug.trim()) return;
    const timeout = window.setTimeout(() => saveRef.current(), 900);
    return () => window.clearTimeout(timeout);
  }, [changed, busy, error, draft, saved]);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setError("");
    setDraft(current => ({ ...current, [key]: value }));
  }

  async function copy(value: string, kind: "slug" | "html") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setError("Clipboard access is unavailable. Select and copy the text instead.");
    }
  }

  const status = error ? error : busy ? "Saving…" : changed ? "Unsaved changes" : "Saved to cloud";

  return <form onSubmit={event => { event.preventDefault(); void save(); }} className="editor-shell">
    <header className="editor-header">
      <div className="editor-identity">
        <FileText size={17} />
        <strong>{draft.title || "Untitled document"}</strong>
        <span className="editor-code">{systemId}</span>
      </div>
      <div className="editor-header-actions">
        <span className={"save-status" + (error ? " is-error" : changed ? " is-pending" : "")} role="status" title={status}>
          <i aria-hidden="true" />{status}
        </span>
        <button type="button" className="button secondary" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen(open => !open)}>
          {inspectorOpen ? <PanelRightClose size={16} /> : <PanelRight size={16} />} Properties
        </button>
      </div>
    </header>

    <div className={"editor-body" + (inspectorOpen ? "" : " without-inspector")}>
      <div className="editor-main">
        <div className="editor-canvas">
          <div className="editor-view" data-active={mode === "visual"}>
            <div className="editor-view-label">Visual</div>
            <VisualEditor editor={editor} issue={issue} />
          </div>
          <div className="editor-view" data-active={mode === "markdown"}>
            <div className="editor-view-label">Markdown</div>
            <textarea
              aria-label="Document Markdown"
              className="editor-markdown"
              value={draft.markdown}
              onChange={event => change("markdown", event.target.value)}
              placeholder="Start writing in Markdown…"
              maxLength={500_000}
              spellCheck={false}
            />
          </div>
          <div className="editor-view" data-active={mode === "html"}>
            <div className="editor-view-label">
              Semantic HTML
              <button type="button" className="button secondary" onClick={() => void copy(html, "html")}>
                {copied === "html" ? <Check size={15} /> : <Copy size={15} />}
                {copied === "html" ? "Copied" : "Copy HTML"}
              </button>
            </div>
            <div className="markdown editor-preview" dangerouslySetInnerHTML={{ __html: html }} />
          </div>
        </div>
      </div>

      {inspectorOpen && <aside className="inspector" aria-label="Document properties">
        <div className="inspector-head">
          <h2>Properties</h2>
          <button type="button" className="icon-button" aria-label="Hide properties" onClick={() => setInspectorOpen(false)}><PanelRightClose size={16} /></button>
        </div>
        <div className="inspector-scroll">
          <section className="inspector-section">
            <label>Document title<input value={draft.title} onChange={event => change("title", event.target.value)} maxLength={160} /></label>
          </section>
          <section className="inspector-section">
            <label>URL slug<input value={draft.slug} onChange={event => change("slug", event.target.value)} maxLength={100} /></label>
            <div className="slug-row">
              <code title={"/d/" + systemId}>/d/{systemId}</code>
              <button type="button" className="icon-button" aria-label="Copy slug" title="Copy slug" onClick={() => void copy(draft.slug, "slug")}>
                {copied === "slug" ? <Check size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </section>
          {folders && <section className="inspector-section">
            <label>Parent folder
              <select value={draft.folderId ?? ""} onChange={event => change("folderId", event.target.value || null)}>
                <option value="">No folder</option>
                {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
              </select>
            </label>
          </section>}
          <section className="inspector-section">
            <h3>Metrics</h3>
            <dl className="metric-list">
              <div><dt>Words</dt><dd>{words.toLocaleString()}</dd></div>
              <div><dt>Characters</dt><dd>{text.length.toLocaleString()}</dd></div>
              <div><dt>Reading time</dt><dd>{readingTime ? `${readingTime} min` : "—"}</dd></div>
            </dl>
            <p className="engine-badge"><FileCode2 size={14} /> Markdown + GFM</p>
          </section>
          <section className="inspector-section">
            <h3>Document info</h3>
            <dl className="metric-list">
              <div><dt>Status</dt><dd>Draft</dd></div>
              <div><dt>Last edited</dt><dd>{savedLabel}</dd></div>
            </dl>
          </section>
        </div>
      </aside>}
    </div>

    <footer className="editor-dock" aria-label="Editor toolbar">
      <div className="dock-tools">
        <EditorToolbar editor={editor} disabled={mode !== "visual" || !editor?.isEditable} expanded={toolsExpanded} onToggleExpanded={() => setToolsExpanded(expanded => !expanded)} />
      </div>
      <div className="dock-modes" role="group" aria-label="Editor mode">
        {(["visual", "markdown", "html"] as const).map(option => (
          <button key={option} type="button" aria-pressed={mode === option} onClick={() => setMode(option)}>
            {option === "html" ? "HTML" : option[0].toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
    </footer>
  </form>;
}
