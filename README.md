# Amazfit Notes

Read your Obsidian markdown notes on your Amazfit Active 2 Round smartwatch.

## Architecture

```
Obsidian → Git push → GitHub → Webhook → VPS git pull → FastAPI → HTTPS → Phone (Side Service) → BLE → Watch
```

## Project Structure

```
amazfit-notes/
├── api/                    # Python/FastAPI backend (VPS)
│   ├── src/
│   │   ├── api/v1/         # REST endpoints
│   │   ├── schemas/        # Pydantic models (17 block types)
│   │   └── services/       # Markdown parser + vault reader
│   ├── tests/              # 25 tests (pytest)
│   └── infra/              # systemd + nginx configs
│
└── watch/                  # Zepp OS app (smartwatch)
    ├── page/
    │   ├── home/           # Watch/ folder notes (home screen)
    │   ├── folders/        # Folder browser
    │   ├── notes/          # Note list
    │   ├── note-view/      # Markdown rendered view
    │   └── shared/         # Renderer, colors, layout
    ├── app-side/           # Side Service (phone ↔ API bridge)
    └── lib/                # Communication protocol
```

## Features

- **Full markdown rendering** on a round 466×466 AMOLED display
- **17 block types**: headings (h1-h6), paragraphs, bold, italic, strikethrough, inline code, code blocks, ordered/unordered lists, checkboxes, blockquotes, tables, horizontal rules
- **AMOLED-optimized** color palette (pure black background, accent colors per block type)
- **Instant sync** via GitHub webhook (push → available on watch in seconds)
- **Secure** API key authentication + path traversal protection
- **Free infrastructure**: DuckDNS (free domain) + Let's Encrypt (free SSL)

## Tech Stack

| Component | Technology |
|-----------|-----------|
| API | Python 3.12, FastAPI, mistune 3.x, Pydantic |
| Watch App | JavaScript (ES6), Zepp OS 5.0, @zeppos/zml |
| Target Device | Amazfit Active 2 Round (466×466, API Level 4.2) |
| Infrastructure | Ubuntu VPS, Nginx, systemd, Let's Encrypt |
| Sync | GitHub Webhooks (HMAC-SHA256 validated) |

## API Endpoints

| Route | Description |
|-------|-------------|
| `GET /api/v1/health` | Health check |
| `GET /api/v1/folders` | List root folders (Watch, Diarios, Projetos) |
| `GET /api/v1/folders/{path}` | List folder contents |
| `GET /api/v1/notes/{path}` | Get note parsed as structured blocks |
| `POST /api/v1/webhook/github` | GitHub push webhook (triggers git pull) |

## Setup

### API

```bash
cd api
uv venv .venv && source .venv/bin/activate
uv pip install -e ".[dev]"
cp .env.example .env  # Configure vault path and API key
uvicorn src.main:app --host 127.0.0.1 --port 8100
```

### Watch App

```bash
cd watch
npm install
zeus login
zeus preview  # Scan QR code with Zepp app
```

### Running Tests

```bash
cd api
source .venv/bin/activate
pytest tests/ -v
```

## How It Works

1. **Write notes** in Obsidian (any device) → push to GitHub
2. **GitHub webhook** triggers instant `git pull` on the VPS
3. **API** reads `.md` files from disk and parses them into structured blocks using mistune AST
4. **Watch app** requests blocks via Side Service (phone as BLE↔HTTPS bridge)
5. **Markdown renderer** converts blocks into native Zepp OS widgets with visual styling

## License

MIT
