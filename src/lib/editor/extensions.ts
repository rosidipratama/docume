import { Node, mergeAttributes, type MarkdownTokenizer } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Highlight } from "@tiptap/extension-highlight";
import { Heading } from "@tiptap/extension-heading";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Emoji, emojis, shortcodeToEmoji } from "@tiptap/extension-emoji";
import {
  definitionListTokenizer,
  emojiTokenizer,
  footnoteDefinitionTokenizer,
  footnoteReferenceTokenizer,
  subscriptTokenizer,
  superscriptTokenizer,
} from "@/lib/markdown-syntax";

/** Headings with the extended `{#custom-id}` syntax from the Markdown cheat sheet. */
export const HeadingWithId = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: null,
        parseHTML: element => element.getAttribute("id"),
        renderHTML: attributes => (attributes.id ? { id: attributes.id } : {}),
      },
    };
  },

  parseMarkdown(token, helpers) {
    const level = (token.depth || 1) as 1 | 2 | 3 | 4 | 5 | 6;
    if (!this.options.levels.includes(level)) {
      return helpers.createNode("paragraph", undefined, helpers.parseInline(token.tokens || []));
    }

    const tokens = (token.tokens || []).map(item => ({ ...item }));
    const last = tokens[tokens.length - 1];
    let id: string | null = null;
    if (last?.type === "text" && typeof last.text === "string") {
      const match = /\s*\{#([\p{L}\p{N}_-]+)\}\s*$/u.exec(last.text);
      if (match) {
        id = match[1];
        last.text = last.text.slice(0, match.index);
        if (!last.text) tokens.pop();
      }
    }

    return helpers.createNode("heading", { level, id }, helpers.parseInline(tokens));
  },

  renderMarkdown(node, helpers) {
    const level = Number(node.attrs?.level) || 1;
    if (!node.content) return "";
    const heading = `${"#".repeat(level)} ${helpers.renderChildren(node.content)}`;
    return node.attrs?.id ? `${heading} {#${node.attrs.id}}` : heading;
  },
});

/** Inline footnote reference: `[^label]` */
export const FootnoteReference = Node.create({
  name: "footnoteReference",
  inline: true,
  group: "inline",
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: {
        default: "1",
        parseHTML: element => element.getAttribute("data-label"),
        renderHTML: attributes => ({ "data-label": attributes.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-type="footnote-reference"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "sup",
      mergeAttributes(HTMLAttributes, { "data-type": "footnote-reference", class: "footnote-ref" }),
      `[${String(node.attrs.label ?? "")}]`,
    ];
  },

  parseMarkdown: (token, helpers) => helpers.createNode("footnoteReference", { label: token.label }),

  renderMarkdown: node => `[^${node.attrs?.label ?? ""}]`,

  markdownTokenizer: footnoteReferenceTokenizer as MarkdownTokenizer,
});

/** Footnote body: `[^label]: text` */
export const FootnoteDefinition = Node.create({
  name: "footnoteDefinition",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      label: {
        default: "1",
        parseHTML: element => element.getAttribute("data-label"),
        renderHTML: attributes => ({ "data-label": attributes.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="footnote-definition"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // The content hole must be the only child; the label is rendered via CSS from data-label.
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "footnote-definition", class: "footnote-definition" }),
      0,
    ];
  },

  parseMarkdown: (token, helpers) =>
    helpers.createNode(
      "footnoteDefinition",
      { label: token.label },
      helpers.parseInline(token.tokens || []),
    ),

  renderMarkdown: (node, helpers) =>
    `[^${node.attrs?.label ?? ""}]: ${node.content ? helpers.renderChildren(node.content) : ""}`,

  markdownTokenizer: footnoteDefinitionTokenizer as MarkdownTokenizer,
});

/** Definition list: `term` followed by `: definition` lines. */
export const DefinitionList = Node.create({
  name: "definitionList",
  group: "block",
  content: "definitionItem+",

  parseHTML() {
    return [{ tag: "dl" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["dl", mergeAttributes(HTMLAttributes, { "data-type": "definition-list" }), 0];
  },

  parseMarkdown: (token, helpers) => {
    const items = ((token.items as Array<Record<string, unknown>>) || []).map(item =>
      helpers.createNode("definitionItem", {}, [
        helpers.createNode(
          "definitionTerm",
          {},
          helpers.parseInline((item.termTokens as never[]) || [{ type: "text", text: String(item.term ?? "") }]),
        ),
        ...(((item.definitions as Array<{ tokens?: never[] }>) || []).map(definition =>
          helpers.createNode("definitionDescription", {}, helpers.parseInline(definition.tokens || [])),
        )),
      ]),
    );
    return helpers.createNode("definitionList", {}, items);
  },

  renderMarkdown: (node, helpers) => helpers.renderChildren(node.content || [], "\n"),

  markdownTokenizer: definitionListTokenizer as MarkdownTokenizer,
});

export const DefinitionItem = Node.create({
  name: "definitionItem",
  group: "definitionItem",
  content: "definitionTerm definitionDescription+",

  parseHTML() {
    return [{ tag: 'div[data-type="definition-item"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "definition-item" }), 0];
  },

  renderMarkdown: (node, helpers) => helpers.renderChildren(node.content || [], "\n"),
});

export const DefinitionTerm = Node.create({
  name: "definitionTerm",
  content: "inline*",

  parseHTML() {
    return [{ tag: "dt" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["dt", mergeAttributes(HTMLAttributes), 0];
  },

  renderMarkdown: (node, helpers) => helpers.renderChildren(node.content || []),
});

export const DefinitionDescription = Node.create({
  name: "definitionDescription",
  content: "inline*",

  parseHTML() {
    return [{ tag: "dd" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["dd", mergeAttributes(HTMLAttributes), 0];
  },

  renderMarkdown: (node, helpers) => `: ${helpers.renderChildren(node.content || [])}`,
});

export const MarkdownSubscript = Subscript.extend({
  markdownTokenizer: subscriptTokenizer as MarkdownTokenizer,
  parseMarkdown: (token, helpers) => helpers.applyMark("subscript", helpers.parseInline(token.tokens || [])),
  renderMarkdown: (node, helpers) => `~${helpers.renderChildren(node)}~`,
});

export const MarkdownSuperscript = Superscript.extend({
  markdownTokenizer: superscriptTokenizer as MarkdownTokenizer,
  parseMarkdown: (token, helpers) => helpers.applyMark("superscript", helpers.parseInline(token.tokens || [])),
  renderMarkdown: (node, helpers) => `^${helpers.renderChildren(node)}^`,
});

export const MarkdownEmoji = Emoji.extend({
  markdownTokenizer: emojiTokenizer(shortcode => Boolean(shortcodeToEmoji(shortcode, emojis))) as MarkdownTokenizer,
  parseMarkdown: (token, helpers) => helpers.createNode("emoji", { name: token.shortcode }),
});

export const editorExtensions = [
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
