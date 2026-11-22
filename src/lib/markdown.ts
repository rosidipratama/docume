import {
  Marked, Renderer,
  type MarkedExtension, type Token as MarkedToken, type RendererThis, type TokenizerThis, type Tokens,
} from "marked";
import { emojis, shortcodeToEmoji } from "@tiptap/extension-emoji";
import {
  definitionListTokenizer,
  emojiTokenizer,
  footnoteDefinitionTokenizer,
  footnoteReferenceTokenizer,
  highlightTokenizer,
  subscriptTokenizer,
  superscriptTokenizer,
  type SyntaxTokenizer,
} from "./markdown-syntax";

const renderer = new Renderer();

function safeUrl(href: string, protocols: string[]) {
  try {
    return protocols.includes(new URL(href, "https://docume.invalid").protocol);
  } catch { return false; }
}

function escapeAttribute(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function titleAttribute(title?: string | null) {
  return title ? ' title="' + escapeAttribute(title) + '"' : "";
}

renderer.html = () => "";
renderer.link = function (token) {
  const content = this.parser.parseInline(token.tokens);
  if (!safeUrl(token.href, ["http:", "https:", "mailto:"])) return content;
  return '<a href="' + escapeAttribute(token.href) + '"' + titleAttribute(token.title) + '">' + content + "</a>";
};
renderer.image = function (token) {
  if (!safeUrl(token.href, ["http:", "https:"])) return "";
  return '<img src="' + escapeAttribute(token.href) + '" alt="' + escapeAttribute(token.text) + '"' + titleAttribute(token.title) + ' loading="lazy" referrerpolicy="no-referrer">';
};

// Extended `{#custom-id}` heading syntax.
const baseHeading = renderer.heading;
renderer.heading = function (token) {
  const match = /\s*\{#([\p{L}\p{N}_-]+)\}\s*$/u.exec(token.text);
  if (!match) return baseHeading.call(this, token);
  const tokens = token.tokens.map(item => {
    if (item.type !== "text") return item;
    return { ...item, text: item.text.replace(/\s*\{#[\p{L}\p{N}_-]+\}\s*$/u, "") };
  }).filter(item => item.type !== "text" || item.text.length > 0);
  return `<h${token.depth} id="${escapeAttribute(match[1])}">${this.parser.parseInline(tokens)}</h${token.depth}>\n`;
};

type ExtendedToken = Tokens.Generic & {
  label?: string;
  shortcode?: string;
  items?: Array<{
    term?: string;
    termTokens?: MarkedToken[];
    definitions?: Array<{ tokens?: MarkedToken[] }>;
  }>;
};

function markExtension(
  tokenizer: SyntaxTokenizer,
  render: (token: ExtendedToken, parse: (tokens: MarkedToken[]) => string) => string,
): MarkedExtension {
  return {
    extensions: [{
      name: tokenizer.name,
      level: tokenizer.level,
      start: tokenizer.start,
      tokenizer(this: TokenizerThis, source: string) {
        const result = tokenizer.tokenize(source, [], { inlineTokens: text => this.lexer.inlineTokens(text) });
        return result as Tokens.Generic | undefined;
      },
      renderer(this: RendererThis, token: Tokens.Generic) {
        return render(token as ExtendedToken, inner => this.parser.parseInline(inner));
      },
    }],
  };
}

const markdownParser = new Marked({ renderer, gfm: true, async: false });
markdownParser.use(
  markExtension(highlightTokenizer, (token, parse) => `<mark>${parse(token.tokens || [])}</mark>`),
  markExtension(subscriptTokenizer, (token, parse) => `<sub>${parse(token.tokens || [])}</sub>`),
  markExtension(superscriptTokenizer, (token, parse) => `<sup>${parse(token.tokens || [])}</sup>`),
  markExtension(footnoteReferenceTokenizer, token => `<sup class="footnote-ref">[${escapeAttribute(String(token.label ?? ""))}]</sup>`),
  markExtension(footnoteDefinitionTokenizer, (token, parse) =>
    `<div class="footnote-definition"><span class="footnote-label">${escapeAttribute(String(token.label ?? ""))}.</span> ${parse(token.tokens || [])}</div>\n`),
  markExtension(definitionListTokenizer, (_token, parse) => {
    const items = (_token.items || []).map(item => {
      const term = item.termTokens
        ? parse(item.termTokens)
        : escapeAttribute(String(item.term ?? ""));
      const definitions = (item.definitions || []).map(definition => `<dd>${parse(definition.tokens || [])}</dd>`).join("");
      return `<dt>${term}</dt>${definitions}`;
    }).join("");
    return `<dl>${items}</dl>\n`;
  }),
  markExtension(emojiTokenizer(shortcode => Boolean(shortcodeToEmoji(shortcode, emojis))), token => {
    const emoji = shortcodeToEmoji(String(token.label ?? ""), emojis)?.emoji;
    return escapeAttribute(emoji || `:${String(token.label ?? "")}:`);
  }),
);

export function renderMarkdown(markdown: string) {
  return markdownParser.parse(markdown, { async: false }) as string;
}

export function containsRawHtml(markdown: string) {
  let found = false;
  markdownParser.walkTokens(markdownParser.lexer(markdown), token => {
    if (token.type === "html") found = true;
  });
  return found;
}
