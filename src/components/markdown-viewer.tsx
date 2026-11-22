import { renderMarkdown } from "@/lib/markdown";
export function MarkdownViewer({ markdown }: { markdown: string }) {
  return markdown.trim() ? <div className="markdown" dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown) }} /> :
    <p className="muted">This document is empty.</p>;
}
