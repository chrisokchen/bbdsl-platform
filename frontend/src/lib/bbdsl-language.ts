/**
 * BBDSL custom language definition for Monaco Editor (5.2.6).
 *
 * Registers a custom "bbdsl" language on top of YAML with
 * syntax highlighting for BBDSL-specific keywords such as
 * `bid`, `meaning`, `hand`, `hcp`, `foreach_suit`, etc.
 */
import type { Monaco } from '@monaco-editor/react'

/** BBDSL-specific keywords grouped by category. */
const BBDSL_KEYWORDS = {
  /** Top-level document keys */
  topLevel: [
    'bbdsl_version',
    'system',
    'conventions',
    'use_conventions',
    'metadata',
    'opening_bids',
    'responses',
    'rebids',
    'competitive',
    'defensive',
    'slam_conventions',
  ],
  /** Bid-related keys */
  bidding: [
    'bid',
    'meaning',
    'forcing',
    'alertable',
    'announcement',
    'continuations',
    'responses',
    'description',
    'conditions',
    'examples',
  ],
  /** Hand evaluation / constraints */
  hand: [
    'hand',
    'hcp',
    'min_hcp',
    'max_hcp',
    'points',
    'total_points',
    'distribution',
    'shape',
    'balanced',
    'unbalanced',
    'semibalanced',
    'suit_length',
    'min_length',
    'max_length',
    'losers',
    'controls',
  ],
  /** Logic / flow control */
  logic: [
    'foreach_suit',
    'foreach_bid',
    'when',
    'otherwise',
    'if',
    'then',
    'else',
    'and',
    'or',
    'not',
    'includes',
    'excludes',
  ],
  /** Convention metadata */
  meta: [
    'name',
    'version',
    'author',
    'locale',
    'description',
    'tags',
    'namespace',
    'license',
    'id',
  ],
  /** Suit / bid symbols */
  suits: ['clubs', 'diamonds', 'hearts', 'spades', 'notrump', 'nt', 'pass', 'double', 'redouble'],
}

// Flatten all keywords for the tokenizer
const ALL_KEYWORDS = Object.values(BBDSL_KEYWORDS).flat()

/**
 * Register the "bbdsl" language with Monaco Editor.
 * Call this once in `beforeMount` callback.
 */
export function registerBBDSLLanguage(monaco: Monaco): void {
  // Only register once
  if (monaco.languages.getLanguages().some((l: { id: string }) => l.id === 'bbdsl')) {
    return
  }

  monaco.languages.register({
    id: 'bbdsl',
    extensions: ['.bbdsl.yaml', '.bbdsl.yml', '.bbdsl'],
    aliases: ['BBDSL', 'bbdsl'],
    mimetypes: ['text/x-bbdsl'],
  })

  monaco.languages.setMonarchTokensProvider('bbdsl', {
    // Case-insensitive keywords
    ignoreCase: true,

    keywords: ALL_KEYWORDS,

    suits: BBDSL_KEYWORDS.suits,
    topLevel: BBDSL_KEYWORDS.topLevel,

    tokenizer: {
      root: [
        // Comments
        [/#.*$/, 'comment'],

        // Bid patterns like 1C, 2NT, 3H, Pass, X, XX, 1♣, 2♦, etc.
        [/\b(pass|double|redouble|[Xx]{1,2})\b/, 'keyword.suit'],
        [/\b[1-7][CcDdHhSs]\b/, 'keyword.suit'],
        [/\b[1-7]\s*(NT|nt|No\s*Trump)\b/, 'keyword.suit'],
        [/[♣♦♥♠]/, 'keyword.suit'],

        // Strings
        [/"([^"\\]|\\.)*"/, 'string'],
        [/'([^'\\]|\\.)*'/, 'string'],

        // Numbers
        [/\b\d+(\.\d+)?\b/, 'number'],

        // Boolean
        [/\b(true|false|yes|no)\b/, 'keyword.boolean'],

        // YAML key: value (key part, before the colon)
        [
          /^(\s*)([a-zA-Z_][\w-]*)\s*:/,
          {
            cases: {
              '$2@topLevel': ['white', 'type.identifier', ''],
              '$2@keywords': ['white', 'keyword', ''],
              '@default': ['white', 'variable', ''],
            },
          },
        ],

        // Inline keywords (not at key position)
        [
          /\b[a-zA-Z_][\w-]*\b/,
          {
            cases: {
              '@suits': 'keyword.suit',
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],

        // YAML special characters
        [/[[\]{}()]/, 'delimiter.bracket'],
        [/[,|>]/, 'delimiter'],
        [/---/, 'tag'],
        [/\.\.\./, 'tag'],
      ],
    },
  })

  // Define a custom theme that extends vs-dark with BBDSL colors
  monaco.editor.defineTheme('bbdsl-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'keyword.suit', foreground: 'CE9178', fontStyle: 'bold' },
      { token: 'keyword.boolean', foreground: '569CD6' },
      { token: 'type.identifier', foreground: '4EC9B0', fontStyle: 'bold' },
      { token: 'variable', foreground: '9CDCFE' },
      { token: 'comment', foreground: '6A9955' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'tag', foreground: '569CD6' },
      { token: 'delimiter', foreground: 'D4D4D4' },
    ],
    colors: {},
  })

  // Provide basic keyword completion
  monaco.languages.registerCompletionItemProvider('bbdsl', {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    provideCompletionItems(model: any, position: any) {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      }

      const suggestions = ALL_KEYWORDS.map((kw) => ({
        label: kw,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: kw,
        range,
      }))

      return { suggestions }
    },
  })
}
