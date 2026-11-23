"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, UploadCloud, X } from "lucide-react";

type Uploaded = { systemId: string; title: string; folderId: string | null };

const accepts = /\.(md|markdown|mdown|mkd|txt)$/i;

export function DocumentDropzone() {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [uploaded, setUploaded] = useState<Uploaded[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const router = useRouter();

  const upload = useCallback(async (incoming: FileList | File[]) => {
    const files = Array.from(incoming).filter(file => accepts.test(file.name));
    if (!files.length) {
      setUploaded([]);
      setMessage("Drop .md, .markdown or .txt files to create documents.");
      return;
    }
    const data = new FormData();
    files.forEach(file => data.append("files", file));
    setBusy(true);
    setMessage("");
    setUploaded([]);
    try {
      const response = await fetch("/api/docs/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "The upload could not be completed.");
      setUploaded(result as Uploaded[]);
      setMessage(`${result.length} document${result.length === 1 ? "" : "s"} uploaded privately, outside any folder.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The upload could not be completed.");
    } finally {
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current += 1;
      setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const onLeave = (event: DragEvent) => {
      if (!hasFiles(event) && !dragDepth.current) return;
      event.preventDefault();
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDragging(false);
    };
    const onEnd = () => { dragDepth.current = 0; setDragging(false); };
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      if (event.dataTransfer?.files.length) void upload(event.dataTransfer.files);
    };
    const options = { capture: true };
    window.addEventListener("dragenter", onEnter, options);
    window.addEventListener("dragover", onOver, options);
    window.addEventListener("dragleave", onLeave, options);
    window.addEventListener("drop", onDrop, options);
    window.addEventListener("dragend", onEnd, options);
    return () => {
      window.removeEventListener("dragenter", onEnter, options);
      window.removeEventListener("dragover", onOver, options);
      window.removeEventListener("dragleave", onLeave, options);
      window.removeEventListener("drop", onDrop, options);
      window.removeEventListener("dragend", onEnd, options);
    };
  }, [upload]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 7000);
    return () => window.clearTimeout(timer);
  }, [message]);

  return <>
    <button type="button" className="button secondary upload-button" onClick={() => inputRef.current?.click()}>
      <UploadCloud size={16} /> Upload files
    </button>
    <input
      ref={inputRef}
      type="file"
      multiple
      hidden
      accept=".md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain"
      onChange={event => {
        if (event.target.files?.length) void upload(event.target.files);
        event.target.value = "";
      }}
    />
    {(dragging || busy) && <div className="drop-overlay" role="status">
      <div className="drop-panel">
        <UploadCloud size={34} />
        <strong>{busy ? "Uploading documents…" : "Drop files to upload"}</strong>
        <span>Markdown and text files become private documents in No folder.</span>
      </div>
    </div>}
    {message && !busy && <div className="upload-toast" role="status">
      <Check size={16} />
      <span>{message}</span>
      {uploaded[0] && <Link href={"/docs/" + uploaded[0].systemId + "/edit"}>Open</Link>}
      <button type="button" aria-label="Dismiss" onClick={() => setMessage("")}><X size={14} /></button>
    </div>}
  </>;
}
