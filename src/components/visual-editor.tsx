"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Highlight } from "@tiptap/extension-highlight";
import {
  Bold, Braces, Code, Heading1, Heading2, Heading3, Highlighter, Image as ImageIcon,
  Italic, Link2, List, ListChecks, ListOrdered, ListTree, Minus, Quote, Smile,
  Strikethrough, Subscript, Superscript, Table2, Bookmark, Hash,
} from "lucide-react";
import { renderMarkdown, containsRawHtml } from "@/lib/markdown";
import {
  DefinitionDescription, DefinitionItem, DefinitionList, DefinitionTerm,
  FootnoteDefinition, FootnoteReference, HeadingWithId, MarkdownEmoji,
  MarkdownSubscript, MarkdownSuperscript,
} from "@/lib/editor/extensions";

const extensions = [
  StarterKit.configure({ underline: false, heading: false, link: { openOnClick: false } }),
  HeadingWithId,
  Markdown.configure({ markedOptions: { gfm: true } }),
  Image,
  TableKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight,
  MarkdownSubscript,
  MarkdownSuperscript,
  MarkdownEmoji,
  FootnoteReference,
  FootnoteDefinition,
  DefinitionList,
  DefinitionItem,
  DefinitionTerm,
  DefinitionDescription,
];

function hrefOrNull(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : null;
  } catch { return null; }
}

export function VisualEditor({ source, onChange }: { source: string; onChange: (value: string) => void }) {
  const [initial] = useState(source);
  const [issue, setIssue] = useState("");
  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    content: initial,
    contentType: "markdown",
    editorProps: { attributes: { class: "markdown visual-content", role: "textbox", "aria-label": "Document content", "aria-multiline": "true" } },
    onCreate({ editor }) {
      try {
        if (!containsRawHtml(initial) && renderMarkdown(editor.getMarkdown()) === renderMarkdown(initial)) return;
        setIssue("This document contains formatting that the visual editor can’t preserve. Open Markdown to edit it.");
      } catch {
        setIssue("The visual editor couldn’t read this document. Open Markdown to edit it.");
      }
      editor.setEditable(false);
    },
    onUpdate({ editor }) {
      if (!editor.isEditable) return;
      try {
        onChange(editor.getMarkdown());
      } catch {
        editor.setEditable(false);
        setIssue("The last edit couldn’t be converted to Markdown. Your previous draft is still available in Markdown mode.");
      }
    },
  });
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      h1: editor?.isActive("heading", { level: 1 }), h2: editor?.isActive("heading", { level: 2 }),
      h3: editor?.isActive("heading", { level: 3 }), bold: editor?.isActive("bold"),
      italic: editor?.isActive("italic"), strike: editor?.isActive("strike"),
      highlight: editor?.isActive("highlight"), subscript: editor?.isActive("subscript"),
      superscript: editor?.isActive("superscript"), code: editor?.isActive("code"),
      link: editor?.isActive("link"), bullet: editor?.isActive("bulletList"),
      ordered: editor?.isActive("orderedList"), task: editor?.isActive("taskList"),
      quote: editor?.isActive("blockquote"), codeBlock: editor?.isActive("codeBlock"),
      table: editor?.isActive("table"), heading: editor?.isActive("heading"),
    }),
  });

  const tools = !editor ? [] : [
    { icon: Heading1, label: "Heading 1", active: active?.h1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { icon: Heading2, label: "Heading 2", active: active?.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { icon: Heading3, label: "Heading 3", active: active?.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { icon: Hash, label: "Heading ID", active: false, run: () => {
      if (!editor.isActive("heading")) return window.alert("Place the cursor in a heading first.");
      const id = window.prompt("Heading ID (letters, numbers, - and _)", String(editor.getAttributes("heading").id ?? ""));
      if (id === null) return;
      if (id && !/^[\p{L}\p{N}_-]+$/u.test(id)) return window.alert("Use only letters, numbers, hyphens and underscores.");
      editor.chain().focus().updateAttributes("heading", { id: id || null }).run();
    } },
    { icon: Bold, label: "Bold", active: active?.bold, run: () => editor.chain().focus().toggleBold().run() },
    { icon: Italic, label: "Italic", active: active?.italic, run: () => editor.chain().focus().toggleItalic().run() },
    { icon: Strikethrough, label: "Strikethrough", active: active?.strike, run: () => editor.chain().focus().toggleStrike().run() },
    { icon: Highlighter, label: "Highlight", active: active?.highlight, run: () => editor.chain().focus().toggleHighlight().run() },
    { icon: Subscript, label: "Subscript", active: active?.subscript, run: () => editor.chain().focus().toggleSubscript().run() },
    { icon: Superscript, label: "Superscript", active: active?.superscript, run: () => editor.chain().focus().toggleSuperscript().run() },
    { icon: Code, label: "Inline code", active: active?.code, run: () => editor.chain().focus().toggleCode().run() },
    { icon: Link2, label: "Link", active: active?.link, run: () => {
      if (editor.isActive("link")) return void editor.chain().focus().unsetLink().run();
      const value = window.prompt("Link URL (https://, http:// or mailto:)", "https://");
      const href = value ? hrefOrNull(value) : null;
      if (!href) return void (value ? window.alert("Enter a valid http, https or mailto URL.") : undefined);
      editor.chain().focus().setLink({ href }).run();
    } },
    { icon: ImageIcon, label: "Image", active: false, run: () => {
      const src = window.prompt("Image URL (https:// or http://)", "https://");
      const safe = src ? hrefOrNull(src) : null;
      if (!safe || safe.startsWith("mailto:")) return void (src ? window.alert("Enter a valid http or https image URL.") : undefined);
      const alt = window.prompt("Image description", "") ?? "";
      editor.chain().focus().setImage({ src: safe, alt }).run();
    } },
    { icon: Smile, label: "Emoji", active: false, run: () => {
      const shortcode = window.prompt("Emoji shortcode, for example :joy:", "joy")?.trim().replace(/^:|:$/g, "");
      if (!shortcode) return;
      if (!editor.chain().focus().setEmoji(shortcode).run()) window.alert("Unknown emoji shortcode.");
    } },
    { icon: List, label: "Bullet list", active: active?.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
    { icon: ListOrdered, label: "Numbered list", active: active?.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { icon: ListChecks, label: "Task list", active: active?.task, run: () => editor.chain().focus().toggleTaskList().run() },
    { icon: Quote, label: "Quote", active: active?.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { icon: Braces, label: "Code block", active: active?.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
    { icon: Minus, label: "Horizontal rule", active: false, run: () => editor.chain().focus().setHorizontalRule().run() },
    { icon: Table2, label: "Table", active: active?.table, run: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { icon: Bookmark, label: "Footnote reference", active: false, run: () => {
      const label = window.prompt("Footnote number or label", "1")?.trim();
      if (label) editor.chain().focus().insertContent({ type: "footnoteReference", attrs: { label } }).run();
    } },
    { icon: ListTree, label: "Footnote text", active: false, run: () => {
      const label = window.prompt("Footnote number or label", "1")?.trim();
      if (!label) return;
      const text = window.prompt("Footnote text", "")?.trim();
      editor.chain().focus().insertContent({
        type: "footnoteDefinition", attrs: { label },
        ...(text ? { content: [{ type: "text", text }] } : {}),
      }).run();
    } },
    { icon: ListTree, label: "Definition list", active: false, run: () => editor.chain().focus().insertContent({
      type: "definitionList",
      content: [{ type: "definitionItem", content: [
        { type: "definitionTerm", content: [{ type: "text", text: "term" }] },
        { type: "definitionDescription", content: [{ type: "text", text: "definition" }] },
      ] }],
    }).run() },
  ];

  if (issue) return <div className="editor-preview"><p role="status" className="muted">{issue}</p></div>;
  return <>
    <div className="format-tools visual-tools" aria-label="Formatting">
      {tools.map(({ icon: Icon, label, active: isActive, run }, index) => (
        <span key={label + index} className={index === 15 || index === 21 ? "tool-group-end" : undefined}>
          <button type="button" className="icon-button" title={label} aria-label={label} aria-pressed={!!isActive} onClick={run}>
            <Icon size={16} />
          </button>
        </span>
      ))}
    </div>
    <EditorContent editor={editor} />
  </>;
}
