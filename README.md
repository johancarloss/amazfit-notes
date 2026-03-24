# Amazfit Notes

[![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Zepp OS](https://img.shields.io/badge/Zepp_OS-5.0-orange)](https://docs.zepp.com)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-26_passing-brightgreen)]()

Read your **Obsidian** markdown notes on your **Amazfit Active 2 Round** smartwatch — with full formatting, offline cache, and instant sync.

---

## Architecture

```
                                  ┌──────────────┐
                                  │   Obsidian    │
                                  │  (any device) │
                                  └──────┬───────┘
                                         │ git push
                                         v
                                  ┌──────────────┐
                                  │    GitHub     │
                                  └──────┬───────┘
                                         │ webhook (instant)
                                         v
┌─────────────────────────────────────────────────────────┐
│  VPS                                                    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  FastAPI  ←── git pull ←── Obsidian vault (.md) │    │
│  │  (parser + REST API)                            │    │
│  └──────────────────┬──────────────────────────────┘    │
│                     │ HTTPS (DuckDNS + Let's Encrypt)   │
└─────────────────────┼───────────────────────────────────┘
                      v
               ┌──────────────┐
               │  Zepp App    │
               │  (phone)     │
               │  Side Service│
               └──────┬───────┘
                      │ BLE
                      v
               ┌──────────────┐
               │  Amazfit     │
               │  Active 2    │
               │  (466×466)   │
               └──────────────┘
```

## Features

- **17 markdown block types** rendered natively on a round AMOLED display
  - Headings (h1–h6), paragraphs, bold, italic, strikethrough
  - Inline code, code blocks (with language hint)
  - Ordered/unordered lists (nested), checkboxes
  - Blockquotes (nested), tables, horizontal rules
- **AMOLED-optimized** color palette — pure black background, accent colors per block type
- **Offline-first** — cache-first strategy: reads from local storage, syncs when connected
- **Instant sync** — GitHub webhook triggers `git pull` on push (seconds, not minutes)
- **Secure** — API key auth, HMAC-SHA256 webhook validation, rate limiting, path traversal protection
- **Free infrastructure** — DuckDNS (free domain forever) + Let's Encrypt (free SSL)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **API** | Python 3.12, FastAPI, mistune 3.x (AST parser), Pydantic |
| **Watch App** | JavaScript (ES6), Zepp OS 5.0, @zeppos/zml |
| **Device** | Amazfit Active 2 Round (466×466, API Level 4.2) |
| **Infrastructure** | Ubuntu VPS, Nginx (rate-limited), systemd, Let's Encrypt |
| **Sync** | GitHub Webhooks (HMAC-SHA256) |
| **Testing** | pytest (26 tests), httpx |

## Project Structure

```
amazfit-notes/
├── api/                         # Python/FastAPI backend (VPS)
│   ├── src/
│   │   ├── api/v1/              # REST endpoints (folders, notes, webhook, health)
│   │   ├── schemas/             # Pydantic models (17 block types)
│   │   ├── services/
│   │   │   ├── markdown_parser.py   # mistune AST → structured blocks
│   │   │   └── vault_reader.py      # Secure filesystem access
│   │   ├── config.py            # pydantic-settings (.env)
│   │   ├── dependencies.py      # DI (auth, singleton reader)
│   │   └── main.py              # App factory
│   ├── tests/                   # 26 tests (parser + API + security)
│   └── infra/                   # systemd + nginx (rate-limited) configs
│
└── watch/                       # Zepp OS smartwatch app
    ├── page/
    │   ├── home/                # Watch/ folder (home screen)
    │   ├── folders/             # Folder browser (all vault)
    │   ├── notes/               # Note list
    │   ├── note-view/           # Markdown rendered view (scrollable)
    │   └── shared/
    │       ├── markdown-renderer.js  # Blocks → Zepp OS widgets
    │       ├── list-builder.js       # Scrollable tap-list builder
    │       ├── colors.js             # AMOLED color palette
    │       └── layout.js             # Round display safe areas
    ├── app-side/                # Side Service (phone ↔ API bridge)
    ├── lib/
    │   ├── communication.js     # Persistent cache (localStorage)
    │   └── fetch-with-cache.js  # Cache-first fetch strategy
    └── config.example.js        # API credentials template
```

## API Endpoints

| Route | Auth | Description |
|-------|------|-------------|
| `GET /api/v1/health` | API Key | Health check |
| `GET /api/v1/folders` | API Key | List root folders |
| `GET /api/v1/folders/{path}` | API Key | List folder contents |
| `GET /api/v1/notes/{path}` | API Key | Get note as structured blocks |
| `POST /api/v1/webhook/github` | HMAC-SHA256 | Vault sync on push |

### Example: Parsed Note Response

```json
{
  "title": "My Note",
  "block_count": 5,
  "blocks": [
    { "type": "h1", "text": "My Note" },
    { "type": "paragraph", "text": "Some text here" },
    { "type": "bold", "text": "Important" },
    { "type": "code_inline", "text": "variable_name" },
    { "type": "ul", "text": "List item", "indent": 0 }
  ]
}
```

## Setup

### API

```bash
cd api
uv venv .venv && source .venv/bin/activate
uv pip install -e ".[dev]"
cp .env.example .env   # Set AMAZFIT_VAULT_PATH, AMAZFIT_API_KEY, AMAZFIT_WEBHOOK_SECRET
uvicorn src.main:app --host 127.0.0.1 --port 8100
```

### Watch App

```bash
cd watch
cp config.example.js config.local.js   # Set API_BASE and API_KEY
npm install
zeus login
zeus preview   # Scan QR code with Zepp app → Developer Mode → Scan
```

### Tests

```bash
cd api && source .venv/bin/activate
pytest tests/ -v   # 26 tests
```

## How It Works

1. **Write notes** in Obsidian (desktop or mobile) → push to GitHub
2. **GitHub webhook** instantly triggers `git pull` on the VPS
3. **FastAPI** reads `.md` files, parses via mistune AST into typed blocks
4. **Watch app** requests blocks through the Side Service (phone as BLE↔HTTPS bridge)
5. **Markdown renderer** maps each block type to native Zepp OS widgets with distinct colors/sizes
6. **Offline cache** stores everything locally — works without phone connection

## Security

- API key authentication on all endpoints (via `X-API-Key` header)
- GitHub webhook validation (HMAC-SHA256 signature)
- Path traversal protection (resolved paths checked against vault root)
- Rate limiting at Nginx level (30 req/min API, 5 req/min webhook)
- No secrets in source code (externalized to `.env` and `config.local.js`)
- Swagger/OpenAPI docs disabled in production
- Generic error messages (no internal path leakage)

## License

[MIT](LICENSE)
