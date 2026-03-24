# Watch App

The watch app runs on Zepp OS (the Amazfit operating system). It has 4 pages and a Side Service that bridges the phone to the API.

## Zepp OS Constraints

Building for a smartwatch is fundamentally different from web or mobile:

| Constraint | Impact |
|------------|--------|
| **466×466 round display** | Content clips at the circular edges. Need ~50px margins top/bottom. |
| **No web views** | Can't render HTML. Must use native widgets (TEXT, FILL_RECT, etc.) |
| **No HTTP from watch** | Watch can't call APIs. Must use phone as a bridge (Side Service). |
| **Single style per TEXT widget** | Can't mix font sizes or colors in one text element. |
| **No text measurement API** | Can't ask "how tall is this text?". Must estimate based on character count. |
| **Limited memory** | Must limit number of widgets created on screen. |

## App Structure

```
watch/
├── app.js                    Entry point — initializes BaseApp
├── app.json                  Manifest — device targets, pages, permissions
├── config.example.js         API credentials template (real file is gitignored)
│
├── page/
│   ├── home/index.js         Home screen — lists Watch/ folder notes
│   ├── folders/index.js      Folder browser — navigates the full vault
│   ├── notes/index.js        Note list — shows notes in a specific folder
│   ├── note-view/index.js    Note reader — renders markdown blocks
│   └── shared/
│       ├── markdown-renderer.js   Blocks → native Zepp OS widgets
│       ├── list-builder.js        Scrollable tappable list
│       ├── ui-helpers.js          Shared loading/error/offline indicators
│       ├── colors.js              AMOLED-optimized color palette
│       └── layout.js              Screen dimensions and safe areas
│
├── app-side/index.js         Side Service — runs on phone, bridges BLE↔HTTPS
└── lib/
    ├── communication.js      Cache read/write (localStorage)
    └── fetch-with-cache.js   Cache-first fetch strategy
```

## Navigation Flow

```
┌──────────┐    tap note    ┌──────────────┐
│   Home   │ ──────────────▸│  Note View   │
│ (Watch/) │                │  (rendered)  │
└────┬─────┘                └──────────────┘
     │
     │ tap "Todas as Pastas"
     ▼
┌──────────┐    tap folder  ┌──────────┐    tap note    ┌──────────────┐
│ Folders  │ ──────────────▸│ Folders  │ ──────────────▸│  Note View   │
│ (root)   │                │ (nested) │                │  (rendered)  │
└──────────┘                └──────────┘                └──────────────┘
```

Every navigation uses `push()` from `@zos/router`, which adds to the back stack. The hardware back button returns to the previous page.

## The Rendering Engine

`markdown-renderer.js` is the most complex piece of the watch app. It converts a flat list of blocks into native Zepp OS widgets inside a scrollable container.

### Block → Widget Mapping

Each block type gets a distinct visual treatment:

```javascript
const BLOCK_STYLES = {
  h1: { size: 30, color: 0xffa726 },  // Large amber
  h2: { size: 26, color: 0xffcc80 },  // Medium gold
  paragraph: { size: 18, color: 0xffffff },  // Normal white
  bold: { size: 18, color: 0xffcc00 },  // Bright yellow
  code_inline: { size: 16, color: 0x4fc3f7 },  // Cyan
  // ...
};
```

### The Rendering Loop

```javascript
for (const block of blocks) {
  const style = BLOCK_STYLES[block.type];
  currentY += style.marginTop;

  // Create a TEXT widget at the current Y position
  container.createWidget(widget.TEXT, {
    x: MARGIN_X + (block.indent * 16),
    y: currentY,
    w: availableWidth,
    h: estimatedHeight,
    text: block.text,
    text_size: style.size,
    color: style.color,
  });

  currentY += estimatedHeight + style.marginBottom;
}
```

Widgets stack vertically. Each block advances `currentY` by its height + margins. The container scrolls when content exceeds screen height.

### Special Blocks

**Code blocks and inline code** get a dark background:
```javascript
// Dark rounded rectangle behind the text
container.createWidget(widget.FILL_RECT, { color: 0x1e1e2e, radius: 8 });
// Cyan text on top
container.createWidget(widget.TEXT, { color: 0x4fc3f7 });
```

**Blockquotes** get a left border:
```javascript
// 3px cyan border
container.createWidget(widget.FILL_RECT, { w: 3, color: 0x4fc3f7 });
// Indented gray text
container.createWidget(widget.TEXT, { x: textX + 12, color: 0x9e9e9e });
```

**List items** get prefixes:
```javascript
const PREFIX_MAP = {
  ul: "• ",
  checkbox_checked: "✓ ",
  checkbox_unchecked: "○ ",
};
```

### Height Estimation

Zepp OS has no API to measure text. We estimate:

```javascript
function estimateTextHeight(text, fontSize, availableWidth) {
  const avgCharWidth = fontSize * 0.45;      // Conservative estimate
  const charsPerLine = Math.floor(availableWidth / avgCharWidth);
  const lines = text.split("\n");
  let totalLines = 0;

  for (const line of lines) {
    totalLines += line.length === 0 ? 1 : Math.ceil(line.length / charsPerLine);
  }

  totalLines += 1; // Safety margin
  return totalLines * (fontSize + 6);
}
```

The `0.45` multiplier is conservative — it overestimates the number of lines slightly, which is better than underestimating (which would clip text).

### Round Display Handling

The 466×466 display is circular. Content at the very top and bottom gets clipped by the round edges:

```javascript
export const CONTENT = {
  MARGIN_X: 36,       // Horizontal safe area
  MARGIN_TOP: 50,     // Top safe area (below round edge)
  MARGIN_BOTTOM: 50,  // Bottom padding (above round edge)
  WIDTH: 394,         // 466 - 36*2
};
```

## Side Service: The Phone Bridge

The Side Service runs in the Zepp phone app. It receives messages from the watch and translates them to HTTP requests:

```
Watch: { method: "GET_NOTE_BLOCKS", params: { path: "Watch/todo.md" } }
  ↓ BLE
Side Service: fetch("https://.../api/v1/notes/Watch/todo.md")
  ↓ HTTP
API Response: { blocks: [...] }
  ↓ BLE
Watch: receives blocks, renders them
```

The Side Service uses `@zeppos/zml` (Zepp Messaging Library), which provides the `BaseSideService` mixin with `onRequest(req, res)`:

```javascript
AppSideService(
  BaseSideService({
    onRequest(req, res) {
      // req.method = "GET_NOTE_BLOCKS"
      // req.params = { path: "Watch/todo.md" }
      fetch({ url: API_BASE + "/notes/" + req.params.path })
        .then(response => res(null, { result: response.body }));
    },
  })
);
```

## The List Builder

`list-builder.js` creates scrollable, tappable lists used on all list pages:

```javascript
buildList(startY, height, items, onTap);
```

Each item is a stack of 3 widgets:
1. **BUTTON** (background) — handles tap events, shows press animation
2. **TEXT** (title) — note name or folder name
3. **TEXT** (subtitle) — path or note count

Items live inside a `VIEW_CONTAINER` with `scroll_enable: true`, so the list scrolls when there are more items than fit on screen.

## Color Palette: AMOLED Optimization

The watch has an AMOLED display where **black pixels are literally off** (zero power consumption). The color palette is designed around this:

```javascript
export const COLORS = {
  BG_PRIMARY: 0x000000,     // Pure black — pixels off, saves battery
  BG_CODE: 0x1e1e2e,        // Very dark blue — minimal power
  ACCENT_H1: 0xffa726,      // Amber — high contrast on black
  TEXT_PRIMARY: 0xffffff,    // White — maximum readability
  CODE: 0x4fc3f7,           // Cyan — distinct from text
  CHECKBOX_DONE: 0x66bb6a,  // Green — "done" semantic
};
```

This isn't just aesthetic — it directly impacts battery life. A fully white screen uses ~6x more power than a black screen on AMOLED.
