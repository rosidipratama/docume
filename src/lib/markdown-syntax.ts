type SyntaxToken = Record<string, unknown> & { type: string; raw: string };

type SyntaxLexer = {
  inlineTokens: (source: string) => unknown[];
};

export type SyntaxTokenizer = {
  name: string;
  level: "block" | "inline";
  start: (source: string) => number;
  tokenize: (source: string, tokens: unknown[], lexer: SyntaxLexer) => SyntaxToken | undefined;
};

export const footnoteReferenceTokenizer: SyntaxTokenizer = {
  name: "footnoteReference",
  level: "inline",
  start: source => source.indexOf("[^"),
  tokenize(source) {
    const match = /^\[\^([^\]\s]+)\]/.exec(source);
    if (!match) return undefined;
    return { type: "footnoteReference", raw: match[0], label: match[1] };
  },
};

export const footnoteDefinitionTokenizer: SyntaxTokenizer = {
  name: "footnoteDefinition",
  level: "block",
  start(source) {
    const match = /(?:^|\n)[ \t]*(\[\^[^\]:\s]+\]:[ \t]+\S)/.exec(source);
    if (!match) return -1;
    return match.index + match[0].indexOf(match[1]);
  },
  tokenize(source, _tokens, lexer) {
    const match = /^\[\^([^\]:\s]+)\]:[ \t]+([^\n]+)(?:\n|$)/.exec(source);
    if (!match) return undefined;
    return {
      type: "footnoteDefinition",
      raw: match[0].replace(/\n$/, ""),
      label: match[1],
      text: match[2],
      tokens: lexer.inlineTokens(match[2]),
    };
  },
};

export const definitionListTokenizer: SyntaxTokenizer = {
  name: "definitionList",
  level: "block",
  start(source) {
    const match = /\n[ \t]*:[ \t]+\S/.exec(source);
    if (!match) return -1;
    return source.lastIndexOf("\n", match.index - 1) + 1;
  },
  tokenize(source, _tokens, lexer) {
    const match = /^([^\n]+)\n((?:[ \t]*:[ \t]+[^\n]+(?:\n|$))+)/.exec(source);
    if (!match) return undefined;
    const term = match[1].trim();
    const definitions = match[2]
      .split("\n")
      .map(line => line.trim().replace(/^:\s*/, ""))
      .filter(Boolean);
    if (!term || !definitions.length) return undefined;
    return {
      type: "definitionList",
      raw: match[0],
      items: [
        {
          term,
          termTokens: lexer.inlineTokens(term),
          definitions: definitions.map(text => ({ text, tokens: lexer.inlineTokens(text) })),
        },
      ],
    };
  },
};

export const subscriptTokenizer: SyntaxTokenizer = {
  name: "subscript",
  level: "inline",
  start: source => source.indexOf("~"),
  tokenize(source, _tokens, lexer) {
    const match = /^~(?![~\s])([^~\n]*[^~\s])~(?![~])/.exec(source);
    if (!match) return undefined;
    return {
      type: "subscript",
      raw: match[0],
      text: match[1],
      tokens: lexer.inlineTokens(match[1]),
    };
  },
};

export const superscriptTokenizer: SyntaxTokenizer = {
  name: "superscript",
  level: "inline",
  start: source => source.indexOf("^"),
  tokenize(source, _tokens, lexer) {
    const match = /^\^(?![\^\s])([^\^\n]*[^\^\s])\^/.exec(source);
    if (!match) return undefined;
    return {
      type: "superscript",
      raw: match[0],
      text: match[1],
      tokens: lexer.inlineTokens(match[1]),
    };
  },
};

export const highlightTokenizer: SyntaxTokenizer = {
  name: "highlight",
  level: "inline",
  start: source => source.indexOf("=="),
  tokenize(source, _tokens, lexer) {
    const match = /^==(?![=\s])([^=\n]*[^=\s])==/.exec(source);
    if (!match) return undefined;
    return {
      type: "highlight",
      raw: match[0],
      text: match[1],
      tokens: lexer.inlineTokens(match[1]),
    };
  },
};

export function emojiTokenizer(isKnown: (shortcode: string) => boolean): SyntaxTokenizer {
  return {
    name: "emoji",
    level: "inline",
    start: source => source.indexOf(":"),
    tokenize(source) {
      const match = /^:([a-zA-Z0-9_+-]+):/.exec(source);
      if (!match || !isKnown(match[1])) return undefined;
      return { type: "emoji", raw: match[0], shortcode: match[1], label: match[1] };
    },
  };
}

export type DefinitionListItemToken = {
  term: string;
  definitions: { text: string; tokens: unknown[] }[];
};
