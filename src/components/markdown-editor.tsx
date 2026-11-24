"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen, Check, Clock3, Copy, FileText, Folder, History, Info,
  Link2, MoreHorizontal, PanelRight, PanelRightClose, Save, Share2, X,
} from "lucide-react";
import { useDocumentEditor, EditorToolbar, VisualEditor } from "./visual-editor";
import { renderMarkdown, renderSemanticHtml } from "@/lib/markdown";
import { useEditorCommands } from "@/lib/editor/commands";
import { CommandPalette, type PaletteCommand } from "./command-palette";

type Draft = { title: string; slug: string; markdown: string; folderId: string | null };
type Folder = { id: string; name: string };
type Author = { name: string; username: string };
type Mode = "visual" | "markdown" | "html";

function authorInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MarkdownEditor({ systemId, initial, folders, author, initialVersion, createdAt, accessPanel }: {
  systemId: string;
  initial: Draft;
  folders?: Folder[];
  author: Author;
  initialVersion: string;
  createdAt: string;
  accessPanel?: ReactNode;
}) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<Mode>("visual");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
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
  const { palette: editorCommands } = useEditorCommands(editor, mode !== "visual");

  useEffect(() => { setSavedLabel(relativeTime(lastSaved)); }, [lastSaved]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(open => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 1020) setInspectorOpen(false);
  }, []);

  useEffect(() => {
    if (!changed) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeUnload", beforeUnload);
    return () => window.removeEventListener("beforeUnload", beforeUnload);
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
  const pillTone = error ? " is-error" : changed || busy ? " is-pending" : "";
  const activeFolder = folders?.find(folder => folder.id === draft.folderId);

  const tabs: { key: Mode; label: string; glyph?: string; name: string }[] = [
    { key: "visual", label: "Visual", name: "Visual" },
    { key: "markdown", label: "", glyph: "/ MD", name: "Markdown" },
    { key: "html", label: "HTML", glyph: "</>", name: "HTML" },
  ];

  const paletteCommands: PaletteCommand[] = [
    ...editorCommands.map(command => ({ ...command, group: "Formatting" })),
    { id: "view-visual", group: "View", label: "Visual mode", glyph: "W", keywords: "wysiwyg rich text",
      disabled: mode === "visual", run: () => setMode("visual") },
    { id: "view-markdown", group: "View", label: "Markdown mode", glyph: "MD", keywords: "raw source md",
      disabled: mode === "markdown", run: () => setMode("markdown") },
    { id: "view-html", group: "View", label: "HTML mode", glyph: "</>", keywords: "semantic markup",
      disabled: mode === "html", run: () => setMode("html") },
    { id: "document-save", group: "Document", label: "Save document", icon: Save, keywords: "sync persist",
      hint: changed ? undefined : "No unsaved changes", disabled: !changed || busy, run: () => void save() },
    { id: "document-copy-slug", group: "Document", label: "Copy URL slug", icon: Link2, keywords: "link clipboard",
      disabled: !draft.slug.trim(), run: () => void copy(draft.slug, "slug") },
    { id: "document-copy-html", group: "Document", label: "Copy semantic HTML", icon: Copy, keywords: "export clipboard",
      run: () => void copy(html, "html") },
    { id: "document-properties", group: "Document", label: inspectorOpen ? "Hide properties" : "Show properties",
      icon: inspectorOpen ? PanelRightClose : PanelRight, keywords: "inspector sidebar metadata",
      run: () => setInspectorOpen(open => !open) },
    { id: "document-read", group: "Document", label: "Read document", icon: BookOpen, keywords: "reader view",
      run: () => router.push("/d/" + systemId) },
    { id: "document-share", group: "Document", label: "Sharing and access", icon: Share2, keywords: "permissions invite",
      hint: accessPanel ? undefined : "Only the owner can manage sharing",
      disabled: !accessPanel, run: () => setAccessOpen(true) },
  ];

  return <div className="editor-shell">
    <header className="editor-topbar">
      <nav className="editor-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard" className="crumb-link" aria-label="Workspace"><Info size={15} /></Link>
        <Link href="/dashboard" className="crumb-link">Workspace</Link>
        <span className="crumb-slash">/</span>
        <span className="crumb-link">Documentation</span>
        <span className="crumb-slash">/</span>
        <FileText size={15} className="crumb-icon" />
        <span className="crumb-current" title={draft.title}>{draft.title || "Untitled document"}</span>
        <MoreHorizontal size={15} className="crumb-more" />
      </nav>
      <div className="editor-save-state">
        <span className={"saved-pill" + pillTone} role="status" title={status}>
          <i aria-hidden="true" />{status}
        </span>
      </div>
      <div className="editor-top-actions">
        <Link href={"/d/" + systemId} className="top-action"><BookOpen size={14} /> Read document</Link>
        <button type="button" className="top-action" onClick={() => setAccessOpen(true)} disabled={!accessPanel} title={accessPanel ? "Sharing and access" : "Only the owner can manage sharing"}>
          <Share2 size={14} /> Share
        </button>
        <button type="button" className="top-action top-action-primary" onClick={() => void save()}>Save</button>
        <button type="button" className="top-action" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen(open => !open)}>
          {inspectorOpen ? <PanelRightClose size={14} /> : <PanelRight size={14} />} Properties
        </button>
      </div>
    </header>

    <div className={"editor-body" + (inspectorOpen ? "" : " without-inspector")}>
      <div className="editor-workspace">
        <div className="editor-canvas-scroll">
          <div className="editor-canvas">
            <div className="editor-view" data-active={mode === "visual"}>
              <VisualEditor editor={editor} issue={issue} />
            </div>
            <div className="editor-view" data-active={mode === "markdown"}>
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
              <pre className="editor-html" aria-label="Generated HTML"><code>{html}</code></pre>
            </div>
          </div>
        </div>

        <div className="editor-bottom-docks">
          <div className="format-toolbar" aria-label="Formatting toolbar">
            <EditorToolbar editor={editor} disabled={mode !== "visual" || !editor?.isEditable} expanded={toolsExpanded} onToggleExpanded={() => setToolsExpanded(expanded => !expanded)} />
          </div>
          <div className="status-bar" aria-label="Editor status">
            <div className="view-tabs" role="group" aria-label="Editor mode">
              {tabs.map(tab => <button
                key={tab.key}
                type="button"
                className={"view-tab" + (mode === tab.key ? " is-active" : "")}
                aria-label={tab.name}
                aria-pressed={mode === tab.key}
                onClick={() => setMode(tab.key)}
              >
                {tab.key === "visual" && <i className="tab-dot" aria-hidden="true" />}
                {tab.glyph && <span className="tab-glyph">{tab.glyph}</span>}
                <span>{tab.label}</span>
              </button>)}
            </div>
            <div className="status-meta">
              {mode === "html" && <button type="button" className="copy-html" onClick={() => void copy(html, "html")}>
                {copied === "html" ? <Check size={12} /> : <Copy size={12} />}
                {copied === "html" ? "Copied" : "Copy HTML"}
              </button>}
              <span className="status-stats">
                {words} words&nbsp; · &nbsp;{text.length} chars&nbsp; · &nbsp;{readingTime} min read&nbsp; · &nbsp;Edited {savedLabel}
              </span>
              <button type="button" className="quick-commands" title="Open quick commands (⌘K)" aria-haspopup="dialog" onClick={() => setPaletteOpen(true)}>
                <kbd>⌘K</kbd> Quick Commands
              </button>
            </div>
          </div>
        </div>
      </div>

      {inspectorOpen && <aside className="inspector" aria-label="Document properties">
        <div className="inspector-head">
          <div className="inspector-title"><FileText size={14} /><span>Document Info</span></div>
          <div className="inspector-head-actions">
            <span className="version-badge">Draft v1.4</span>
            <button type="button" className="inspector-close" aria-label="Hide properties" onClick={() => setInspectorOpen(false)}><X size={15} /></button>
          </div>
        </div>
        <div className="inspector-scroll">
          <section className="inspector-section field-section">
            <label className="field-label" htmlFor="doc-title">TITLE</label>
            <div className="field-input"><input id="doc-title" value={draft.title} onChange={event => change("title", event.target.value)} maxLength={160} /></div>
          </section>

          <section className="inspector-section field-section">
            <label className="field-label" htmlFor="doc-slug">URL SLUG</label>
            <div className="field-input with-icon">
              <input id="doc-slug" value={draft.slug} onChange={event => change("slug", event.target.value)} maxLength={100} />
              <button type="button" className="field-icon" aria-label="Copy slug" title="Copy slug" onClick={() => void copy(draft.slug, "slug")}>
                {copied === "slug" ? <Check size={13} /> : <Link2 size={13} />}
              </button>
            </div>
            <p className="route-hint"><span>Live route:</span><code>docs.studio.internal/{draft.slug || "sample"}</code></p>
          </section>

          {folders && <section className="inspector-section field-section">
            <label className="field-label" htmlFor="doc-folder">FOLDER LOCATION</label>
            <div className="field-input with-icon">
              <Folder size={14} className="field-leading" />
              <select id="doc-folder" value={draft.folderId ?? ""} onChange={event => change("folderId", event.target.value || null)}>
                <option value="">No folder</option>
                {folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
              </select>
            </div>
            {activeFolder && <p className="field-note">This document lives in {activeFolder.name}.</p>}
          </section>}

          <section className="inspector-section">
            <div className="section-head-row"><span className="field-label">TAGS</span><span className="section-count">2 tags</span></div>
            <div className="tag-row">
              <span className="tag">#general <X size={10} /></span>
              <span className="tag">#release-notes <X size={10} /></span>
            </div>
            <button type="button" className="add-tag" title="Tags are coming soon" aria-disabled="true">+ Add tag</button>
          </section>

          <section className="inspector-section">
            <span className="field-label">DOCUMENT METRICS</span>
            <div className="metrics-card">
              <div className="metric"><span>Word count</span><strong>{words.toLocaleString()} words</strong></div>
              <div className="metric"><span>Characters</span><strong>{text.length.toLocaleString()} characters</strong></div>
              <div className="metric"><span>Reading time</span><strong>{readingTime ? `${readingTime} min` : "—"}</strong></div>
              <div className="metric"><span>Format engine</span><strong>WYSIWYG / Markdown</strong></div>
            </div>
          </section>

          <section className="inspector-section">
            <span className="field-label">AUDIT &amp; HISTORY</span>
            <div className="author-row">
              <span className="author-avatar" title={author.name}>{authorInitials(author.name)}</span>
              <span className="author-text">
                <strong>{author.name}</strong>
                <small>Original author{author.name !== author.username ? ` · @${author.username}` : ""}</small>
              </span>
            </div>
            <div className="history-meta">
              <div><Clock3 size={11} /><span>Last edited {savedLabel}</span></div>
              <div><FileText size={11} /><span>Created {formatDate(createdAt)}</span></div>
            </div>
          </section>
        </div>
        <div className="inspector-foot">
          <button type="button" className="footer-action" title="Version history is coming soon" aria-disabled="true"><History size={12} /> Version history</button>
          <button type="button" className="footer-delete" onClick={() => setAccessOpen(true)} disabled={!accessPanel}>Delete</button>
        </div>
      </aside>}
    </div>

    {accessOpen && <div className="editor-dialog-backdrop" onClick={() => setAccessOpen(false)}>
      <div className="editor-dialog" role="dialog" aria-modal="true" aria-label="Sharing and access" onClick={event => event.stopPropagation()}>
        <div className="editor-dialog-head">
          <h2>Sharing and access</h2>
          <button type="button" className="inspector-close" aria-label="Close" onClick={() => setAccessOpen(false)}><X size={16} /></button>
        </div>
        <div className="editor-dialog-body">
          {accessPanel ?? <p className="muted">Only the document owner can manage sharing and deletion.</p>}
        </div>
      </div>
    </div>}

    <CommandPalette open={paletteOpen} commands={paletteCommands} onClose={() => setPaletteOpen(false)} />
  </div>;
}
