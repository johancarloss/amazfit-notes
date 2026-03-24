# Architecture Overview

## The Problem

You write notes in Obsidian on your computer or phone. You want to read them on your smartwatch — formatted, not raw markdown. The watch can't access the internet directly. It can only talk to the phone via Bluetooth.

## The Solution

A chain of 5 components, each solving one piece:

```
 [1] Obsidian        Write notes, push to GitHub
      │
      │ git push
      ▼
 [2] GitHub          Stores notes + notifies our server on push
      │
      │ webhook POST
      ▼
 [3] API Server      Reads .md files, parses markdown into blocks
      │
      │ HTTPS response
      ▼
 [4] Phone           Receives blocks, forwards to watch via Bluetooth
      │
      │ BLE (Bluetooth Low Energy)
      ▼
 [5] Watch           Renders blocks as colored widgets on screen
```

## Why Each Component Exists

### [1] Obsidian → GitHub

Obsidian stores notes as `.md` files in a local folder (called a "vault"). The Obsidian Git plugin automatically commits and pushes changes to GitHub. This is how your notes leave your computer.

**Key insight:** We don't connect to Obsidian directly. We use Git/GitHub as the transport layer. This means any markdown editor works — Obsidian is just one option.

### [2] GitHub → API Server

When you push to GitHub, a **webhook** fires. GitHub sends an HTTP POST to our server with a signed payload. Our server verifies the signature (HMAC-SHA256) and runs `git pull` to get the latest files.

**Why not poll?** Polling (checking every N minutes) wastes resources and adds delay. Webhooks are instant — your note appears on the watch seconds after pushing.

**Why not skip GitHub?** The watch could fetch directly from GitHub's API. But then we'd need to parse markdown on the phone (limited JavaScript runtime) and we'd depend on GitHub being available. Our server gives us control over parsing, caching, and security.

### [3] API Server → Phone

The server is a Python/FastAPI application that:
1. Reads `.md` files from the local vault copy
2. Parses them using an AST (Abstract Syntax Tree) parser
3. Converts the AST into a flat list of typed blocks
4. Serves the blocks as JSON via HTTPS

**Example:** A note like this:

```markdown
# Shopping List
- [x] Rice
- [ ] Beans
> Don't forget the **coupon**
```

Becomes this JSON:

```json
[
  { "type": "h1", "text": "Shopping List" },
  { "type": "checkbox_checked", "text": "Rice" },
  { "type": "checkbox_unchecked", "text": "Beans" },
  { "type": "blockquote", "text": "Don't forget the" },
  { "type": "bold", "text": "coupon" }
]
```

**Why parse on the server?** The watch has limited CPU and memory. Parsing a 500-line markdown file on the watch would be slow and drain battery. The server does the heavy work and sends a compact result.

### [4] Phone → Watch

Zepp OS (the watch operating system) does not allow the watch to make HTTP requests. Only the phone can. So the architecture uses the phone as a **bridge**:

- **Side Service**: A small JavaScript program that runs inside the Zepp app on the phone. It receives requests from the watch via Bluetooth, makes HTTP calls to the API, and sends the response back.

- **BLE Protocol**: The watch sends a message like `{ method: "GET_NOTE_BLOCKS", params: { path: "Watch/shopping.md" } }`. The Side Service translates this to an HTTP GET, fetches the response, and sends it back over Bluetooth.

**Why can't the watch access the internet?** It's a hardware limitation. The watch has Bluetooth, but no Wi-Fi. All internet access goes through the phone.

### [5] Watch Rendering

The watch receives a flat list of blocks and converts each one into a native widget:

| Block Type | Visual Treatment |
|------------|-----------------|
| `h1` | Large amber text |
| `paragraph` | Normal white text |
| `code_block` | Cyan text on dark background |
| `checkbox_checked` | Green text with ✓ prefix |
| `blockquote` | Gray text with cyan left border |

All widgets are stacked vertically inside a scrollable container. The display is round (466×466 pixels), so content has extra margins at the top and bottom to avoid clipping at the edges.

## Data Flow: End to End

Here's what happens when you add a note and read it on the watch:

```
 Time    Event
──────   ──────────────────────────────────────────────────
 0:00    You write "todo.md" in Obsidian and save
 0:01    Obsidian Git plugin commits and pushes to GitHub
 0:02    GitHub sends webhook POST to the API server
 0:02    Server verifies HMAC signature, runs git pull
 0:02    Server now has "todo.md" on disk
 0:05    You open Amazfit Notes on your watch
 0:05    Watch asks Side Service: "get Watch/ folder contents"
 0:05    Side Service calls GET /api/v1/folders/Watch
 0:06    Server reads the folder, returns list of notes
 0:06    Watch displays the list, you tap "todo.md"
 0:06    Watch asks Side Service: "get blocks for todo.md"
 0:06    Side Service calls GET /api/v1/notes/Watch/todo.md
 0:07    Server reads the file, parses markdown, returns blocks
 0:07    Watch renders blocks as colored widgets
 0:07    You're reading your note on your wrist
```

Total time from save to reading: **~7 seconds**.

## Security Boundaries

```
 Internet ──────┬───── API Server (HTTPS + API Key)
                │         │
                │         ├── Webhook (HMAC-SHA256 signature)
                │         ├── Endpoints (X-API-Key header)
                │         ├── Path traversal protection
                │         └── Rate limiting (Nginx)
                │
 Bluetooth ─────┴───── Phone ←──→ Watch
                        (Side Service)
```

- **Internet → Server**: Protected by API key, rate limiting, and SSL
- **GitHub → Server**: Protected by HMAC-SHA256 signature validation
- **Phone → Watch**: Bluetooth pairing (handled by Zepp OS)
- **Filesystem**: Vault reader validates all paths against an allowlist and prevents directory traversal

## Project Structure

```
amazfit-notes/
│
├── api/                         SERVER (Python)
│   ├── src/
│   │   ├── main.py              App factory, startup validation
│   │   ├── config.py            Environment-based configuration
│   │   ├── dependencies.py      Auth + dependency injection
│   │   ├── api/v1/              HTTP endpoints
│   │   ├── schemas/             Data models (Pydantic)
│   │   └── services/            Business logic (parser, vault reader)
│   ├── tests/                   26 automated tests
│   └── infra/                   Deployment configs
│
└── watch/                       WATCH APP (JavaScript)
    ├── app.js                   App lifecycle (entry point)
    ├── app-side/                Side Service (phone bridge)
    ├── page/                    UI pages (home, folders, note viewer)
    │   └── shared/              Rendering engine, colors, layout
    └── lib/                     Cache + communication helpers
```

## Key Design Decisions

| Decision | Why |
|----------|-----|
| Parse markdown on server, not watch | Watch has ~64MB RAM and weak CPU. Server parsing is instant. |
| Flat block list, not nested tree | Easier to render sequentially. The watch just iterates and creates widgets. |
| Cache-first on watch | BLE disconnects are common. Showing stale data beats showing errors. |
| GitHub webhook, not polling | Instant sync, zero wasted requests. |
| Monorepo | Two components, one project. Easy to understand, clone, and maintain. |
| DuckDNS + Let's Encrypt | Free forever. No recurring domain costs. |
