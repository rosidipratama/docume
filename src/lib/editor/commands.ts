import type { ComponentType } from "react";
import { useEditorState } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  Bookmark, Code2, Hash, Highlighter,
  History, Image as ImageIcon, Italic, Link2, List, ListChecks, ListOrdered,
  ListTree, Minus, Pilcrow, Quote, Redo2, Smile, Strikethrough, Subscript,
  Superscript, Table2, Undo2,
} from "lucide-react";

export type EditorCommand = {
  id: string;
  label: string;
  icon?: ComponentType<{ size?: number }>;
  glyph?: string;
  keywords?: string;
  active?: boolean;
  disabled?: boolean;
  featured?: boolean;
  palette?: boolean;
  run: () => void;
};

type Flags = {
  h1: boolean; h2: boolean; h3: boolean; bold: boolean; italic: boolean;
  strike: boolean; highlight: boolean; subscript: boolean; superscript: boolean;
  code: boolean; link: boolean; bullet: boolean; ordered: boolean; task: boolean;
  quote: boolean; codeBlock: boolean; table: boolean; canUndo: boolean; canRedo: boolean;
};

const EMPTY_FLAGS: Flags = {
  h1: false, h2: false, h3: false, bold: false, italic: false,
  strike: false, highlight: false, subscript: false, superscript: false,
  code: false, link: false, bullet: false, ordered: false, task: false,
  quote: false, codeBlock: false, table: false, canUndo: false, canRedo: false,
};

function hrefOrNull(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? value : null;
  } catch { return null; }
}

/** One source of truth for toolbar buttons and `⌘K` quick commands. */
export function useEditorCommands(editor: Editor | null, disabled = false) {
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
  }) ?? EMPTY_FLAGS;

  const chain = (editor: Editor | null) => editor?.chain().focus();

  const headingId = (): void => {
    if (!editor || !editor.isActive("heading")) return window.alert("Place the cursor in a heading first.");
    const id = window.prompt("Heading ID (letters, numbers, - and _)", String(editor.getAttributes("heading").id ?? ""));
    if (id === null) return;
    if (id && !/^[\p{L}\p{N}_-]+$/u.test(id)) return window.alert("Use only letters, numbers, hyphens and underscores.");
    editor.chain().focus().updateAttributes("heading", { id: id || null }).run();
  };
  const link = (): void => {
    if (!editor) return;
    if (editor.isActive("link")) return void editor.chain().focus().unsetLink().run();
    const value = window.prompt("Link URL (https://, http:// or mailto:)", "https://");
    const href = value ? hrefOrNull(value) : null;
    if (!href) return void (value ? window.alert("Enter a valid http, https or mailto URL.") : undefined);
    editor.chain().focus().setLink({ href }).run();
  };
  const image = (): void => {
    if (!editor) return;
    const src = window.prompt("Image URL (https:// or http://)", "https://");
    const safe = src ? hrefOrNull(src) : null;
    if (!safe || safe.startsWith("mailto:")) return void (src ? window.alert("Enter a valid http or https image URL.") : undefined);
    const alt = window.prompt("Image description", "") ?? "";
    editor.chain().focus().setImage({ src: safe, alt }).run();
  };
  const emoji = (): void => {
    if (!editor) return;
    const shortcode = window.prompt("Emoji shortcode, for example :joy:", "joy")?.trim().replace(/^:|:$/g, "");
    if (!shortcode) return;
    if (!editor.chain().focus().setEmoji(shortcode).run()) window.alert("Unknown emoji shortcode.");
  };
  const footnoteReference = (): void => {
    if (!editor) return;
    const label = window.prompt("Footnote number or label", "1")?.trim();
    if (label) editor.chain().focus().insertContent({ type: "footnoteReference", attrs: { label } }).run();
  };
  const footnoteDefinition = (): void => {
    if (!editor) return;
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
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: "definitionList",
      content: [{ type: "definitionItem", content: [
        { type: "definitionTerm", content: [{ type: "text", text: "term" }] },
        { type: "definitionDescription", content: [{ type: "text", text: "definition" }] },
      ] }],
    }).run();
  };
  const clearFormatting = (): void => {
    if (!editor) return;
    editor.chain().focus().unsetAllMarks().setParagraph().run();
  };

  const commands: Record<string, EditorCommand> = {
    "heading-1": { id: "heading-1", glyph: "H1", label: "Heading 1", keywords: "title h1 large",
      active: active.h1, disabled, run: () => chain(editor)?.toggleHeading({ level: 1 }).run() },
    "heading-2": { id: "heading-2", glyph: "H2", label: "Heading 2", keywords: "subtitle h2 medium",
      active: active.h2, disabled, run: () => chain(editor)?.toggleHeading({ level: 2 }).run() },
    "heading-3": { id: "heading-3", glyph: "H3", label: "Heading 3", keywords: "h3 small",
      active: active.h3, disabled, run: () => chain(editor)?.toggleHeading({ level: 3 }).run() },
    bold: { id: "bold", glyph: "B", label: "Bold", keywords: "strong b",
      active: active.bold, disabled, run: () => chain(editor)?.toggleBold().run() },
    italic: { id: "italic", glyph: "I", label: "Italic", keywords: "emphasis i",
      active: active.italic, disabled, run: () => chain(editor)?.toggleItalic().run() },
    "bullet-list": { id: "bullet-list", icon: List, label: "Bullet list", keywords: "unordered ul",
      active: active.bullet, disabled, run: () => chain(editor)?.toggleBulletList().run() },
    link: { id: "link", icon: Link2, label: "Link", keywords: "hyperlink url",
      active: active.link, disabled, run: link },
    image: { id: "image", icon: ImageIcon, label: "Image", keywords: "picture photo embed",
      disabled, run: image },
    blockquote: { id: "blockquote", icon: Quote, label: "Blockquote", keywords: "quote cite",
      active: active.quote, featured: true, disabled, run: () => chain(editor)?.toggleBlockquote().run() },

    undo: { id: "undo", icon: Undo2, label: "Undo", keywords: "revert",
      disabled: disabled || !active.canUndo, run: () => chain(editor)?.undo().run() },
    redo: { id: "redo", icon: Redo2, label: "Redo", keywords: "repeat",
      disabled: disabled || !active.canRedo, run: () => chain(editor)?.redo().run() },
    strike: { id: "strike", glyph: "S", label: "Strikethrough", keywords: "strike delete",
      active: active.strike, disabled, run: () => chain(editor)?.toggleStrike().run() },
    "inline-code": { id: "inline-code", glyph: "</>", label: "Inline code", keywords: "code monospace",
      active: active.code, disabled, run: () => chain(editor)?.toggleCode().run() },
    superscript: { id: "superscript", glyph: "x²", label: "Superscript", keywords: "above",
      active: active.superscript, disabled, run: () => chain(editor)?.toggleSuperscript().run() },
    "clear-formatting": { id: "clear-formatting", icon: Pilcrow, label: "Clear formatting", keywords: "plain paragraph reset",
      disabled, run: clearFormatting },
    "code-block-glyph": { id: "code-block-glyph", glyph: "{}", label: "Fenced code block", keywords: "code block",
      active: active.codeBlock, disabled, run: () => chain(editor)?.toggleCodeBlock().run() },
    "horizontal-rule-glyph": { id: "horizontal-rule-glyph", glyph: "—", label: "Horizontal rule", keywords: "divider separator",
      disabled, run: () => chain(editor)?.setHorizontalRule().run() },
    "footnote-reference": { id: "footnote-reference", glyph: "[-1]", label: "Footnote reference", keywords: "note citation",
      disabled, run: footnoteReference },
    "heading-id-glyph": { id: "heading-id-glyph", glyph: "#id", label: "Heading ID", keywords: "anchor slug",
      disabled, run: headingId, palette: false },
    "definition-list-glyph": { id: "definition-list-glyph", glyph: "DL", label: "Definition list", keywords: "terms glossary",
      disabled, run: definitionList, palette: false },
    "version-history": { id: "version-history", icon: History, label: "Version history", keywords: "revisions",
      disabled: true, run: () => {}, palette: false },

    "ordered-list": { id: "ordered-list", icon: ListOrdered, label: "Numbered list", keywords: "ordered ol",
      active: active.ordered, disabled, run: () => chain(editor)?.toggleOrderedList().run() },
    "task-list": { id: "task-list", icon: ListChecks, label: "Task checklist", keywords: "todo checkbox",
      active: active.task, disabled, run: () => chain(editor)?.toggleTaskList().run() },
    table: { id: "table", icon: Table2, label: "Table", keywords: "grid rows columns",
      active: active.table, disabled, run: () => chain(editor)?.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    highlight: { id: "highlight", icon: Highlighter, label: "Highlight", keywords: "mark",
      active: active.highlight, disabled, run: () => chain(editor)?.toggleHighlight().run() },
    subscript: { id: "subscript", icon: Subscript, label: "Subscript", keywords: "below x2",
      active: active.subscript, disabled, run: () => chain(editor)?.toggleSubscript().run() },
    "code-block-icon": { id: "code-block-icon", icon: Code2, label: "Code block", keywords: "fenced",
      active: active.codeBlock, disabled, run: () => chain(editor)?.toggleCodeBlock().run(), palette: false },
    emoji: { id: "emoji", icon: Smile, label: "Emoji", keywords: "smile shortcode",
      disabled, run: emoji },
    "footnote-definition": { id: "footnote-definition", icon: Bookmark, label: "Footnote text", keywords: "note definition",
      disabled, run: footnoteDefinition },
    "heading-id-icon": { id: "heading-id-icon", icon: Hash, label: "Heading ID", keywords: "anchor slug",
      disabled, run: headingId, palette: false },
    "definition-list-icon": { id: "definition-list-icon", icon: ListTree, label: "Definition list", keywords: "terms glossary",
      disabled, run: definitionList, palette: false },
    "horizontal-rule-icon": { id: "horizontal-rule-icon", icon: Minus, label: "Horizontal rule", keywords: "divider separator",
      disabled, run: () => chain(editor)?.setHorizontalRule().run(), palette: false },
  };

  const pick = (ids: string[]) => ids.map(id => commands[id]);

  return {
    primary: pick([
      "heading-1", "heading-2", "heading-3", "bold", "italic",
      "bullet-list", "link", "image", "blockquote",
    ]),
    secondary: pick([
      "undo", "redo", "strike", "inline-code", "superscript", "clear-formatting",
      "code-block-glyph", "horizontal-rule-glyph", "footnote-reference",
      "heading-id-glyph", "definition-list-glyph", "version-history",
    ]),
    extra: pick([
      "ordered-list", "task-list", "table", "highlight", "subscript",
      "code-block-icon", "emoji", "footnote-definition", "heading-id-icon",
      "definition-list-icon", "horizontal-rule-icon",
    ]),
    palette: Object.values(commands).filter(command => command.palette !== false),
  };
}
