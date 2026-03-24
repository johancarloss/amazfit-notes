# Documentation

Technical documentation for the Amazfit Notes project. Start with the architecture overview to understand how all pieces connect, then dive into each component.

## Contents

| Document | What You'll Learn |
|----------|-------------------|
| [Architecture Overview](./architecture.md) | How all components connect end-to-end — the big picture |
| [API Deep Dive](./api.md) | How the Python backend works — endpoints, authentication, vault reader |
| [Markdown Parser](./markdown-parser.md) | How raw markdown becomes structured blocks — AST parsing, token conversion |
| [Watch App](./watch-app.md) | How the Zepp OS app works — pages, rendering engine, BLE communication |
| [Offline Cache](./offline-cache.md) | How the cache-first strategy works — read notes without phone connection |
| [Infrastructure](./infrastructure.md) | How to deploy — DNS, SSL, reverse proxy, process manager, webhook sync |

## Reading Order

If you're new to the project:

1. **Architecture Overview** — understand the full data flow
2. **Markdown Parser** — the core logic that makes everything work
3. **API Deep Dive** — how the parser is exposed as a REST service
4. **Watch App** — how blocks become pixels on a round screen
5. **Offline Cache** — how the watch works without a phone
6. **Infrastructure** — how to run it in production
