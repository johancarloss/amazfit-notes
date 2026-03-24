# API Deep Dive

The API is a Python/FastAPI application that reads Obsidian vault files and serves them as structured JSON. It's the brain of the system — everything else is transport or display.

## How It Starts

```python
# src/main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = Settings()
    vault = Path(settings.vault_path)
    if not vault.is_dir():
        raise RuntimeError("Vault directory not found.")
    yield
```

On startup, the app validates that the vault directory exists. If it doesn't, the app refuses to start. This prevents silent failures where the API returns empty results because the path is wrong.

**Swagger/OpenAPI is disabled** in production (`docs_url=None`). The API is not meant to be explored by browsers — only the watch's Side Service calls it.

## Configuration

All settings come from environment variables (prefixed with `AMAZFIT_`), loaded via `pydantic-settings`:

```
AMAZFIT_VAULT_PATH    → Path to the Obsidian vault on disk
AMAZFIT_API_KEY       → Secret key for authenticating requests
AMAZFIT_WEBHOOK_SECRET → Secret for validating GitHub webhook signatures
AMAZFIT_PORT          → Port to listen on (default: 8100)
```

No secrets have defaults. If `AMAZFIT_API_KEY` is missing, the app crashes on startup. This is intentional — it's better to fail loudly than to run without authentication.

## Authentication

Every endpoint (except the webhook) requires an `X-API-Key` header:

```
GET /api/v1/folders
X-API-Key: <your-key>
```

The comparison uses `hmac.compare_digest()` (constant-time) to prevent timing attacks. A regular `==` comparison leaks information about how many characters match, which an attacker could exploit to guess the key one character at a time.

```python
# src/dependencies.py
if not hmac.compare_digest(x_api_key, settings.api_key):
    raise HTTPException(status_code=401, detail="Unauthorized")
```

## Endpoints

### `GET /api/v1/health`

Returns the server status. Requires authentication.

```json
{ "status": "ok", "vault_ok": true }
```

### `GET /api/v1/folders`

Lists the root-level allowed folders.

```json
{
  "path": "/",
  "items": [
    { "name": "Watch", "path": "Watch", "type": "folder", "note_count": 3 },
    { "name": "Diarios", "path": "Diarios", "type": "folder", "note_count": 47 }
  ]
}
```

### `GET /api/v1/folders/{path}`

Lists the contents of a specific folder (subfolders + notes).

```
GET /api/v1/folders/Diarios/2026/03
```

For notes, the title is extracted by reading the first `# Heading` line of the file — **not** the entire file content. This is a performance optimization: listing a folder with 50 notes only reads the first few lines of each, not megabytes of markdown.

### `GET /api/v1/notes/{path}`

The core endpoint. Reads a markdown file, parses it into blocks, and returns structured JSON.

```
GET /api/v1/notes/Watch/shopping.md?max_blocks=150
```

Response:

```json
{
  "path": "Watch/shopping.md",
  "title": "Shopping List",
  "block_count": 5,
  "blocks": [
    { "type": "h1", "text": "Shopping List", "indent": 0 },
    { "type": "checkbox_checked", "text": "Rice", "indent": 0 },
    { "type": "checkbox_unchecked", "text": "Beans", "indent": 0 },
    { "type": "ul", "text": "Sub-item", "indent": 1 }
  ],
  "truncated": false
}
```

The `max_blocks` parameter limits the output (default: 200). If the note produces more blocks, `truncated: true` signals that the note was cut.

### `POST /api/v1/webhook/github`

Receives push events from GitHub. Validates the HMAC-SHA256 signature and runs `git pull`:

```
POST /api/v1/webhook/github
X-Hub-Signature-256: sha256=<hash>
```

The git pull runs asynchronously (`asyncio.create_subprocess_exec`) to avoid blocking other requests. The response only says `{ "status": "ok" }` — no internal details are leaked.

## Vault Reader

`src/services/vault_reader.py` is the only component that touches the filesystem. It has two responsibilities:

### 1. Path Validation (Security)

Every path requested by the client is validated:

```python
resolved = (self._vault / cleaned).resolve()

if not resolved.is_relative_to(self._vault):
    raise PermissionError("Access denied")

top_folder = cleaned.split("/")[0]
if top_folder not in self._allowed:
    raise PermissionError("Access denied")
```

This prevents:
- **Path traversal**: `../../etc/passwd` → blocked by `is_relative_to()`
- **Unauthorized folders**: `.git/config` → blocked by allowlist
- **Symlink escapes**: `.resolve()` follows symlinks before checking

### 2. File Reading

The vault reader extracts metadata without reading entire files:

```python
def _extract_title_fast(self, filepath):
    with open(filepath, "r") as f:
        for line in f:
            if line.strip().startswith("# "):
                return line.strip()[2:]
    return filepath.stem
```

This reads line-by-line and stops at the first heading. For a folder with 50 notes, this means reading ~50 lines total instead of ~50 entire files.

## Dependency Injection

The API uses FastAPI's `Depends()` system for clean separation:

```python
@router.get("/folders")
async def list_folders(vault: VaultReader = Depends(get_vault_reader)):
    ...
```

Both `Settings` and `VaultReader` are singletons (`@lru_cache`), created once and reused across all requests. This avoids re-reading `.env` and re-validating the vault path on every request.

## Error Handling

All errors return generic messages. The API never leaks:
- Filesystem paths
- Python tracebacks
- Git output
- Configuration details

```python
# WRONG: leaks internal path
raise HTTPException(detail=f"File not found: /home/user/vault/note.md")

# RIGHT: generic message
raise HTTPException(detail="Note not found")
```

## Testing

26 tests cover:
- **Parser**: All 17 block types, inline formatting, nesting, truncation
- **API**: Authentication (valid key, invalid key, missing key), folder listing, note retrieval, path traversal blocking
- **Integration**: Real vault files parsed end-to-end

Run with: `cd api && pytest tests/ -v`
