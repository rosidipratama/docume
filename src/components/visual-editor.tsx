"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  Bold, ChevronDown, ChevronUp, Code2, Heading1, Heading2, Heading3,
  Highlighter, Image as ImageIcon, Italic, Link2, List, ListChecks, ListOrdered,
  Minus, Quote, Redo2, Smile, Strikethrough, Subscript, Superscript, Table2,
  Undo2, Bookmark, ListTree, Hash, History, Pilcrow,
} from "lucide-react";
import { containsRawHtml, renderMarkdown } from "@/lib/markdown";
import { editorExtensions } from "@/lib/editor/extensions";

type Tool = {
  icon?: ComponentType<{ size?: number }>;
  glyph?: string;
  label: string;
  active?: boolean;
  featured?: boolean;
  disabled?: boolean;
  run: () => void;
};

function hrefOrNull(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : null;
  } catch { return null; }
}

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
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      h1: !!instance?.isActive("heading", { level: 1 }), h2: !!instance?.isActive("heading", { level: 2 }),
      h3: !!instance?.isActive("heading", { level: 3 }), bold: !!instance?.isActive("bold"),
      italic: !!instance?.isActive("italic"), strike: !!instance?.isActive("strike"),
      highlight: !!instance?.isActive("highlight"), subscript: !!instance?.isActive("subscript"),
      superscript: !!instance?.isActive("superscript"), code: !!instance?.isActive("code"),
      link: !!instance?.isActive("link"), bullet: !!instance?.isActive("bulletList"),
      ordered: !!instance?.isActive("orderedList"), task: !!instance?.isActive("taskList"),
      quote: !!instance?.isActive("blockquote"), codeBlock: !!instance?.isActive("codeBlock"),
      table: !!instance?.isActive("table"), canUndo: !!instance?.can().undo(), canRedo: !!instance?.can().redo(),
    }),
  }) ?? {
    h1: false, h2: false, h3: false, bold: false, italic: false, strike: false,
    highlight: false, subscript: false, superscript: false, code: false, link: false,
    bullet: false, ordered: false, task: false, quote: false, codeBlock: false,
    table: false, canUndo: false, canRedo: false,
  };

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

  const headingId = (): void => {
    if (!editor.isActive("heading")) return window.alert("Place the cursor in a heading first.");
    const id = window.prompt("Heading ID (letters, numbers, - and _)", String(editor.getAttributes("heading").id ?? ""));
    if (id === null) return;
    if (id && !/^[\p{L}\p{N}_-]+$/u.test(id)) return window.alert("Use only letters, numbers, hyphens and underscores.");
    editor.chain().focus().updateAttributes("heading", { id: id || null }).run();
  };
  const link = (): void => {
    if (editor.isActive("link")) return void editor.chain().focus().unsetLink().run();
    const value = window.prompt("Link URL (https://, http:// or mailto:)", "https://");
    const href = value ? hrefOrNull(value) : null;
    if (!href) return void (value ? window.alert("Enter a valid http, https or mailto URL.") : undefined);
    editor.chain().focus().setLink({ href }).run();
  };
  const image = (): void => {
    const src = window.prompt("Image URL (https:// or http://)", "https://");
    const safe = src ? hrefOrNull(src) : null;
    if (!safe || safe.startsWith("mailto:")) return void (src ? window.alert("Enter a valid http or https image URL.") : undefined);
    const alt = window.prompt("Image description", "") ?? "";
    editor.chain().focus().setImage({ src: safe, alt }).run();
  };
  const emoji = (): void => {
    const shortcode = window.prompt("Emoji shortcode, for example :joy:", "joy")?.trim().replace(/^:|:$/g, "");
    if (!shortcode) return;
    if (!editor.chain().focus().setEmoji(shortcode).run()) window.alert("Unknown emoji shortcode.");
  };
  const footnoteReference = (): void => {
    const label = window.prompt("Footnote number or label", "1")?.trim();
    if (label) editor.chain().focus().insertContent({ type: "footnoteReference", attrs: { label } }).run();
  };
  const footnoteDefinition = (): void => {
    const label = window.prompt("Footnote number or label", "1")?.trim();
    if (!label) return;
    const text = window.prompt("Footnote text", "")?.trim();
    editor.chain().focus().insertContent({
      type: "footnoteDefinition",
      attrs: { label },
      ...(text ? { content: [{ type: "text", text }] } : {}),
    }).run();
  };
  const definitionList = (): void => {
    editor.chain().focus().insertContent({
      type: "definitionList",
      content: [{ type: "definitionItem", content: [
        { type: "definitionTerm", content: [{ type: "text", text: "term" }] },
        { type: "definitionDescription", content: [{ type: "text", text: "definition" }] },
      ] }],
    }).run();
  };
  const clearFormatting = (): void => {
    editor.chain().focus().unsetAllMarks().setParagraph().run();
  };

  const primary: Tool[] = [
    { glyph: "H1", label: "Heading 1", active: active.h1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { glyph: "H2", label: "Heading 2", active: active.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { glyph: "H3", label: "Heading 3", active: active.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { glyph: "B", label: "Bold", active: active.bold, run: () => editor.chain().focus().toggleBold().run() },
    { glyph: "I", label: "Italic", active: active.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: List, label: "Bullet list", active: active.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: Link2, label: "Link", active: active.link, run: link },
    { icon: ImageIcon, label: "Image", run: image },
    { icon: Quote, label: "Blockquote", active: active.quote, featured: true, run: () => editor.chain().focus().toggleBlockquote().run() },
  ];

  const secondary: Tool[] = [
    { icon: Undo2, label: "Undo", disabled: !active.canUndo, run: () => editor.chain().focus().undo().run() },
    { icon: Redo2, label: "Redo", disabled: !active.canRedo, run: () => editor.chain().focus().redo().run() },
    { glyph: "S", label: "Strikethrough", active: active.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { glyph: "</>", label: "Inline code", active: active.code, run: () => editor.chain().focus().toggleCode().run() },
    { glyph: "x²", label: "Superscript", active: active.superscript, run: () => editor.chain().focus().toggleSuperscript().run() },
    { icon: Pilcrow, label: "Clear formatting", run: clearFormatting },
    { glyph: "{}", label: "Fenced code block", active: active.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
    { glyph: "—", label: "Horizontal rule", run: () => editor.chain().focus().setHorizontalRule().run() },
    { glyph: "[-1]", label: "Footnote reference", run: footnoteReference },
    { glyph: "#id", label: "Heading ID", run: headingId },
    { glyph: "DL", label: "Definition list", run: definitionList },
    { icon: History, label: "Version history", disabled: true, run: () => {} },
  ];

  const extra: Tool[] = [
    { icon: ListOrdered, label: "Numbered list", active: active.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: ListChecks, label: "Task checklist", active: active.task, run: () => editor.chain().focus().toggleTaskList().run() },
    { icon: Table2, label: "Table", active: active.table, run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { icon: Highlighter, label: "Highlight", active: active.highlight, run: () => editor.chain().focus().toggleHighlight().run() },
    { icon: Subscript, label: "Subscript", active: active.subscript, run: () => editor.chain().focus().toggleSubscript().run() },
    { icon: Code2, label: "Code block", active: active.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
    { icon: Smile, label: "Emoji", run: emoji },
    { icon: Bookmark, label: "Footnote text", run: footnoteDefinition },
    { icon: Hash, label: "Heading ID", run: headingId },
    { icon: ListTree, label: "Definition list", run: definitionList },
    { icon: Minus, label: "Horizontal rule", run: () => editor.chain().focus().setHorizontalRule().run() },
  ];

  const render = (tool: Tool, index: number) => {
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
        {primary.slice(0, 3).map(render)}
        <span className="tool-sep" aria-hidden="true" />
        {primary.slice(3, 5).map((tool, i) => render(tool, i + 3))}
        <span className="tool-sep" aria-hidden="true" />
        {primary.slice(5).map((tool, i) => render(tool, i + 5))}
      </div>
      <button
        ref={moreRef}
        type="button"
        className="tool-more"
        aria-expanded={expanded}
        aria-controls="editor-more-tools"
        onClick={onToggleExpanded}
      >
        More {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
    </div>
    {expanded && <div className="toolbar-extra-group" id="editor-more-tools" ref={groupRef}>
      <div className="toolbar-row toolbar-secondary" aria-label="Extended formatting">{secondary.map(render)}</div>
      <div className="toolbar-row toolbar-extra" aria-label="More formatting">{extra.map(render)}</div>
    </div>}
  </>;
}
