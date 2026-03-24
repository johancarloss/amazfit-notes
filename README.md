# Amazfit Notes

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Zepp OS](https://img.shields.io/badge/Zepp_OS-5.0-orange)](https://docs.zepp.com)
[![Tests](https://img.shields.io/badge/Tests-26_passing-brightgreen)]()
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Read your **Obsidian** markdown notes on your **Amazfit smartwatch** — with full formatting, offline reading, and instant sync.

---

## What It Does

Write notes in Obsidian on any device. Push to GitHub. Open the app on your wrist. Your notes are there — formatted, colored, and scrollable on a round AMOLED display.

**No phone needed after first sync** — everything is cached locally on the watch.

## How It Works

```
  Obsidian ──push──▸ GitHub ──webhook──▸ API ──HTTPS──▸ Phone ──BLE──▸ Watch
                                         │
                                   Parses markdown
                                   into typed blocks
```

1. **Write** notes in Obsidian → push to GitHub
2. **GitHub webhook** triggers the API to pull changes instantly
3. **API** parses `.md` files into structured blocks (headings, lists, code, etc.)
4. **Watch app** fetches blocks via the phone, renders as native widgets
5. **Offline cache** keeps everything readable without the phone

## Markdown Rendering

17 block types rendered natively with distinct visual styles:

| Element | Rendering |
|---------|-----------|
| `# Heading 1–6` | Scaled sizes + amber/gold tones |
| `**bold**` | Bright yellow |
| `*italic*` | Soft gray |
| `` `inline code` `` | Cyan on dark background |
| ```` ```code block``` ```` | Cyan on rounded dark panel |
| `- list` / `1. list` | Bullet/number prefix, nested indent |
| `- [x] checkbox` | Green (done) / Gray (pending) |
| `> blockquote` | Cyan left border + gray text |
| `~~strikethrough~~` | Dimmed gray |
| `\| table \|` | Pipe-separated rows |
| `---` | Horizontal separator |

All optimized for AMOLED — pure black background, pixels off = battery saved.

## Architecture

Full-stack monorepo with two independent components:

```
amazfit-notes/
│
├── api/                    Python/FastAPI backend
│   ├── services/
│   │   ├── markdown_parser    Markdown → AST → typed blocks (mistune)
│   │   └── vault_reader       Secure filesystem access
│   ├── api/v1/                REST endpoints + GitHub webhook
│   ├── schemas/               Pydantic models (17 block types)
│   └── tests/                 26 tests (parser + API + security)
│
└── watch/                  Zepp OS smartwatch app
    ├── page/
    │   ├── home               Curated notes (home screen)
    │   ├── folders            Full vault browser
    │   ├── note-view          Scrollable markdown reader
    │   └── shared/
    │       ├── markdown-renderer   Blocks → native Zepp OS widgets
    │       └── list-builder        Touch-optimized scrollable lists
    ├── app-side/              Side Service (phone ↔ API bridge)
    └── lib/                   Offline cache + fetch strategy
```

### API Endpoints

| Route | Description |
|-------|-------------|
| `GET /api/v1/folders` | List folders |
| `GET /api/v1/folders/{path}` | List folder contents |
| `GET /api/v1/notes/{path}` | Get note parsed as structured blocks |
| `POST /api/v1/webhook/github` | Sync vault on push (HMAC-SHA256) |

### Parsed Note Example

```json
{
  "title": "Study Notes",
  "block_count": 5,
  "blocks": [
    { "type": "h1", "text": "Study Notes" },
    { "type": "paragraph", "text": "Exam topics for next week" },
    { "type": "checkbox_checked", "text": "Linear Algebra" },
    { "type": "checkbox_unchecked", "text": "Calculus III" },
    { "type": "code_inline", "text": "numpy.linalg.solve()" }
  ]
}
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.12, FastAPI, mistune 3.x (AST parser), Pydantic |
| **Watch App** | JavaScript (ES6), Zepp OS 5.0, @zeppos/zml |
| **Target** | Amazfit Active 2 Round (466×466 AMOLED, API Level 4.2) |
| **Infra** | Nginx (rate-limited), systemd, Let's Encrypt, DuckDNS |
| **Sync** | GitHub Webhooks (HMAC-SHA256 validated) |
| **Testing** | pytest (26 tests) |

## Security

- API key authentication on all endpoints
- HMAC-SHA256 webhook signature validation
- Path traversal protection
- Rate limiting (Nginx)
- No secrets in source code
- Swagger/OpenAPI disabled in production

## Quick Start

### API

```bash
cd api
uv venv .venv && source .venv/bin/activate
uv pip install -e ".[dev]"
cp .env.example .env   # Configure vault path and API key
uvicorn src.main:app --port 8100
```

### Watch App

```bash
cd watch
cp config.example.js config.local.js   # Configure API URL and key
npm install
zeus login && zeus preview   # Scan QR with Zepp app
```

### Tests

```bash
cd api && pytest tests/ -v   # 26 tests
```

## License

[MIT](LICENSE)
