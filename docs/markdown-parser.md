# Markdown Parser

The parser converts raw markdown text into a flat list of typed blocks that the watch can render. It's the core logic of the entire project.

## Why Not Send Raw Markdown?

The watch could receive raw markdown and parse it locally. But:

1. **No regex on Zepp OS**: The watch JavaScript runtime has limited regex support
2. **CPU cost**: Parsing a 500-line file on a watch CPU is slow and drains battery
3. **Complexity**: A full markdown parser in JavaScript is ~1000+ lines
4. **Bandwidth**: Parsed blocks are actually smaller than raw markdown (no syntax characters)

So the server parses, and the watch just renders.

## The Library: mistune

We use [mistune](https://github.com/lepture/mistune) v3.x, a Python markdown parser that produces an AST (Abstract Syntax Tree).

```python
import mistune

md = mistune.create_markdown(
    renderer=None,          # None = return AST instead of HTML
    plugins=["strikethrough", "table", "task_lists"],
)

ast = md("# Hello\n\n**bold** and `code`")
```

**Why mistune?**
- AST output (not HTML — we don't want HTML, we want structured data)
- GFM plugins (tables, strikethrough, checkboxes)
- Zero dependencies
- Fast (~10ms for a 500-line file)

**Why not `markdown` or `markdown-it-py`?**
- `markdown` produces HTML, not AST. We'd have to parse HTML back into structure.
- `markdown-it-py` works but mistune's API is more Pythonic and has better type hints.

## How the AST Looks

For this markdown:

```markdown
# Title

A paragraph with **bold** and `code`.

- Item 1
- Item 2
```

Mistune produces:

```python
[
    {"type": "heading", "attrs": {"level": 1}, "children": [
        {"type": "text", "raw": "Title"}
    ]},
    {"type": "paragraph", "children": [
        {"type": "text", "raw": "A paragraph with "},
        {"type": "strong", "children": [{"type": "text", "raw": "bold"}]},
        {"type": "text", "raw": " and "},
        {"type": "codespan", "raw": "code"},
        {"type": "text", "raw": "."}
    ]},
    {"type": "list", "attrs": {"ordered": false}, "children": [
        {"type": "list_item", "children": [
            {"type": "block_text", "children": [{"type": "text", "raw": "Item 1"}]}
        ]},
        {"type": "list_item", "children": [
            {"type": "block_text", "children": [{"type": "text", "raw": "Item 2"}]}
        ]}
    ]}
]
```

This is a tree — nodes contain children which contain more children. But the watch needs a **flat list** of blocks to render sequentially. The parser's job is to flatten this tree.

## Conversion: AST → Flat Blocks

### Block Types

The parser produces 17 block types:

| Type | Markdown Source | Example Output |
|------|----------------|----------------|
| `h1`–`h6` | `# Heading` | `{ type: "h1", text: "Heading" }` |
| `paragraph` | Regular text | `{ type: "paragraph", text: "Some text" }` |
| `bold` | `**text**` | `{ type: "bold", text: "text" }` |
| `italic` | `*text*` | `{ type: "italic", text: "text" }` |
| `strikethrough` | `~~text~~` | `{ type: "strikethrough", text: "text" }` |
| `code_inline` | `` `code` `` | `{ type: "code_inline", text: "code" }` |
| `code_block` | ` ```python ``` ` | `{ type: "code_block", text: "...", language: "python" }` |
| `ul` | `- item` | `{ type: "ul", text: "item", indent: 0 }` |
| `ol` | `1. item` | `{ type: "ol", text: "1. item" }` |
| `checkbox_checked` | `- [x] done` | `{ type: "checkbox_checked", text: "done" }` |
| `checkbox_unchecked` | `- [ ] todo` | `{ type: "checkbox_unchecked", text: "todo" }` |
| `blockquote` | `> quote` | `{ type: "blockquote", text: "quote" }` |
| `hr` | `---` | `{ type: "hr", text: "" }` |
| `table` | `\| a \| b \|` | `{ type: "table", text: "a \| b" }` |

### The Conversion Process

```
 Raw Markdown
      │
      ▼
 mistune.create_markdown(renderer=None)
      │
      ▼
 AST (tree of tokens)
      │
      ▼
 _convert_token() — dispatches by token type
      │
      ├── heading     → MarkdownBlock(type=h1..h6)
      ├── paragraph   → _convert_paragraph() — handles inline formatting
      ├── list        → _convert_list() — handles nesting with indent levels
      ├── block_code  → MarkdownBlock(type=code_block, language=...)
      ├── block_quote → _convert_blockquote() — handles nesting
      ├── table       → _convert_table() — flattens to pipe-separated text
      └── thematic_break → MarkdownBlock(type=hr)
      │
      ▼
 Flat list of MarkdownBlock objects
```

### Inline Formatting: The Interesting Part

A paragraph like `"Some **bold** and `code` here"` contains mixed formatting. Since the watch can only apply one style per widget, we split the paragraph into multiple blocks:

```python
# Input: one paragraph with mixed inline formatting
{"type": "paragraph", "children": [
    {"type": "text", "raw": "Some "},
    {"type": "strong", "children": [{"type": "text", "raw": "bold"}]},
    {"type": "text", "raw": " and "},
    {"type": "codespan", "raw": "code"},
    {"type": "text", "raw": " here"}
]}

# Output: 5 separate blocks, each with its own style
[
    {"type": "paragraph", "text": "Some"},
    {"type": "bold", "text": "bold"},
    {"type": "paragraph", "text": "and"},
    {"type": "code_inline", "text": "code"},
    {"type": "paragraph", "text": "here"}
]
```

The `_convert_paragraph()` method accumulates plain text parts and "flushes" them when it encounters a styled element (bold, italic, code, strikethrough). This flush-on-style-change pattern produces the smallest number of blocks while preserving per-element styling.

### Nested Lists

Lists can be nested. The parser tracks depth via the `indent` parameter:

```markdown
- Parent
  - Child
    - Grandchild
- Another parent
```

```json
[
  { "type": "ul", "text": "Parent", "indent": 0 },
  { "type": "ul", "text": "Child", "indent": 1 },
  { "type": "ul", "text": "Grandchild", "indent": 2 },
  { "type": "ul", "text": "Another parent", "indent": 0 }
]
```

The watch multiplies `indent` by a pixel offset (16px per level) to create visual nesting.

### Text Extraction

The `_extract_text()` method recursively walks inline tokens and extracts clean text:

```
strong("bold")          → "bold"          (strips **)
emphasis("italic")      → "italic"        (strips *)
codespan("code")        → "code"          (strips `)
link("click here", url) → "click here"    (strips URL)
image(alt="photo")      → "[img: photo]"  (shows alt text)
```

This is used everywhere the parser needs plain text from a token that might contain nested formatting.

## Truncation

Large notes (800+ lines) could produce hundreds of blocks. The `max_blocks` parameter limits output:

```python
blocks, truncated = parser.parse(content, max_blocks=150)
# truncated = True if the note was cut
```

The API response includes `"truncated": true` so the watch could potentially show "Note truncated" at the bottom.
