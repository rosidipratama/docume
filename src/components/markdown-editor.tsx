"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VisualEditor } from "./visual-editor";
import { renderMarkdown } from "@/lib/markdown";

type Draft = { title: string; slug: string; markdown: string; folderId: string | null };
type Folder = { id: string; name: string };

export function MarkdownEditor({ systemId, initial, folders, initialVersion }: { systemId: string; initial: Draft; folders?: Folder[]; initialVersion: string }) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"visual" | "markdown" | "preview">("visual");
  const router = useRouter();
  const inFlight = useRef(false);
  const version = useRef(initialVersion);
  const changed = (Object.keys(draft) as (keyof Draft)[]).some(key => draft[key] !== saved[key]);

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

  useEffect(() => {
    if (!changed || busy || error || !draft.title.trim() || !draft.slug.trim()) return;
    const timeout = window.setTimeout(() => void save(), 900);
    return () => window.clearTimeout(timeout);
  });

  function change<K extends keyof Draft>(key: K, value: Draft[K]) {
    setError("");
    setDraft(current => ({ ...current, [key]: value }));
  }

  return <form onSubmit={event => { event.preventDefault(); void save(); }} className="editor">
    <label>Title<input value={draft.title} onChange={event => change("title", event.target.value)} required maxLength={160} /></label>
    <div className="editor-metadata">
      <label>Slug<input value={draft.slug} onChange={event => change("slug", event.target.value)} required maxLength={100} /></label>
      {folders && <label>Folder<select value={draft.folderId ?? ""} onChange={event => change("folderId", event.target.value || null)}>
        <option value="">No folder</option>{folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
      </select></label>}
    </div>
    <div className="editing-surface">
      <div className="editor-bar">
        <div className="tabs" aria-label="Editor view">
          <button type="button" aria-pressed={mode === "visual"} onClick={() => setMode("visual")}>Visual</button>
          <button type="button" aria-pressed={mode === "markdown"} onClick={() => setMode("markdown")}>Markdown</button>
          <button type="button" aria-pressed={mode === "preview"} onClick={() => setMode("preview")}>Preview</button>
        </div>
      </div>
      {mode === "visual" && <VisualEditor source={draft.markdown} onChange={value => change("markdown", value)} />}
      {mode === "markdown" && <textarea aria-label="Document Markdown" value={draft.markdown} onChange={event => change("markdown", event.target.value)} placeholder="Start writing in Markdown…" maxLength={500_000} />}
      {mode === "preview" && <div className="markdown editor-preview" dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.markdown) || "<p>Nothing to preview yet.</p>" }} />}
    </div>
    <div className="section-heading"><span className={error ? "error" : "muted"} role={error ? "alert" : "status"}>{error || (busy ? "Saving…" : changed ? "Unsaved changes" : "All changes saved")}</span>
      <button disabled={busy || !changed} className="button primary">Save changes</button>
    </div>
  </form>;
}
