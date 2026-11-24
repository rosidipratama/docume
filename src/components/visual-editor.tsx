"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import { ChevronDown } from "lucide-react";
import { containsRawHtml, renderMarkdown } from "@/lib/markdown";
import { editorExtensions } from "@/lib/editor/extensions";
import { useEditorCommands, type EditorCommand } from "@/lib/editor/commands";

export function useDocumentEditor({ source, onChange, active }: {
  source: string;
  onChange: (value: string) => void;
  active: boolean;
}) {
  const [initial] = useState(source);
  const [issue, setIssue] = useState("");
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const editor = useEditor({
    extensions: editorExtensions,
    immediatelyRender: false,
    content: initial,
    contentType: "markdown",
    editorProps: {
      attributes: {
        class: "markdown visual-content",
        role: "textbox",
        "aria-label": "Document content",
        "aria-multiline": "true",
      },
    },
    onCreate({ editor: instance }) {
      try {
        if (!containsRawHtml(initial) && renderMarkdown(instance.getMarkdown()) === renderMarkdown(initial)) return;
        setIssue("This document contains formatting that the visual editor can’t preserve. Open Markdown to edit it.");
      } catch {
        setIssue("The visual editor couldn’t read this document. Open Markdown to edit it.");
      }
      instance.setEditable(false);
    },
    onUpdate({ editor: instance }) {
      if (!instance.isEditable) return;
      try {
        onChangeRef.current(instance.getMarkdown());
      } catch {
        instance.setEditable(false);
        setIssue("The last edit couldn’t be converted to Markdown. Your previous draft is still available in Markdown mode.");
      }
    },
  });

  // Keep the editor mounted across mode switches and sync external Markdown edits back into it.
  useEffect(() => {
    if (!editor || !active || !editor.isEditable) return;
    if (editor.getMarkdown() === source) return;
    try {
      editor.commands.setContent(source, { contentType: "markdown", emitUpdate: false });
    } catch {
      editor.setEditable(false);
      setIssue("The Markdown view contains formatting the visual editor can’t read. Keep editing in Markdown mode.");
    }
  }, [source, active, editor]);

  return { editor, issue };
}

export function VisualEditor({ editor, issue }: { editor: Editor | null; issue: string }) {
  if (issue) return <div className="editor-preview"><p role="status" className="muted">{issue}</p></div>;
  return <EditorContent editor={editor} />;
}

export function EditorToolbar({ editor, disabled, expanded, onToggleExpanded }: {
  editor: Editor | null;
  disabled: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const tools = useEditorCommands(editor, disabled);

  const groupRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const toggleRef = useRef(onToggleExpanded);
  toggleRef.current = onToggleExpanded;

  useEffect(() => {
    if (!expanded) return;
    const close = () => toggleRef.current();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (groupRef.current?.contains(target) || moreRef.current?.contains(target)) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded]);

  if (!editor) return <div className="dock-loading" aria-hidden="true" />;

  const render = (tool: EditorCommand, index: number) => {
    const Icon = tool.icon;
    return <button
      key={tool.label + index}
      type="button"
      className={(Icon ? "tool-icon" : "tool-glyph") + (tool.active ? " is-active" : "") + (tool.featured ? " is-featured" : "")}
      title={tool.label}
      aria-label={tool.label}
      aria-pressed={tool.active === undefined ? undefined : !!tool.active}
      disabled={disabled || tool.disabled}
      onClick={tool.run}
    >
      {Icon ? <Icon size={15} /> : tool.glyph}
    </button>;
  };

  return <>
    <div className="toolbar-row toolbar-primary" aria-label="Formatting">
      <div className="toolbar-formatting">
        {tools.primary.slice(0, 3).map(render)}
        <span className="tool-sep" aria-hidden="true" />
        {tools.primary.slice(3, 5).map((tool, i) => render(tool, i + 3))}
        <span className="tool-sep" aria-hidden="true" />
        {tools.primary.slice(5).map((tool, i) => render(tool, i + 5))}
      </div>
      <button
        ref={moreRef}
        type="button"
        className="tool-more"
        aria-expanded={expanded}
        aria-controls="editor-more-tools"
        onClick={onToggleExpanded}
      >
        More <span className="tool-more-caret" aria-hidden="true"><ChevronDown size={14} /></span>
      </button>
    </div>
    {expanded && <div className="toolbar-extra-group" id="editor-more-tools" ref={groupRef}>
      <div className="toolbar-row toolbar-secondary" aria-label="Extended formatting">{tools.secondary.map(render)}</div>
      <div className="toolbar-row toolbar-extra" aria-label="More formatting">{tools.extra.map(render)}</div>
    </div>}
  </>;
}
