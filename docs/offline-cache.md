# Offline Cache

The watch can read notes without a phone connection. This document explains how the cache-first strategy works and why it was designed this way.

## The Problem

The watch communicates with the API through the phone (BLE → Side Service → HTTPS). If any link breaks — phone out of range, Zepp app killed by OS, Bluetooth disconnect — the watch gets nothing.

For a note-reading app, this is unacceptable. You should be able to read your notes anytime, especially the ones you've already opened before.

## The Strategy: Cache-First

```
 User opens a note
        │
        ▼
 Is there cached data?
   ├── YES → Show it immediately (mark as "offline")
   │         Then try to fetch fresh data in background
   │         If fetch succeeds → update display silently
   │         If fetch fails → keep showing cached version
   │
   └── NO → Try to fetch from API
             ├── Success → Show data, save to cache
             └── Failure → Show "No connection and no cache"
```

This is known as **stale-while-revalidate** — a pattern used by browsers, CDNs, and service workers.

## Implementation

### Cache Storage

The watch has `localStorage` (from `@zos/storage`) that persists across app restarts. We use it as a key-value store:

```javascript
// lib/communication.js

function cacheKey(method, params) {
  return "c:" + method + ":" + JSON.stringify(params || {});
}

// Example keys:
// "c:GET_WATCH_NOTES:{}"
// "c:GET_NOTE_BLOCKS:{"path":"Watch/todo.md","max_blocks":150}"
```

Each API response is stored as a JSON string under its cache key. There's no TTL (time-to-live) — cached data stays until overwritten by a fresh response.

**Why no TTL?** For offline use, stale data is always better than no data. If you cached a note 3 days ago and you're offline now, you'd rather see the 3-day-old version than an error screen.

### The Fetch Function

```javascript
// lib/fetch-with-cache.js

export function fetchWithCache(page, method, params, onData, onError) {
  const cached = getCached(method, params);

  // Step 1: Show cached data immediately (if available)
  if (cached) {
    onData(cached, true);  // true = offline/cached
  }

  // Step 2: Try to get fresh data
  try {
    page.request({ method, params })
      .then((data) => {
        const result = data.result || data;
        setCache(method, params, result);  // Update cache
        onData(result, false);             // false = fresh data
      })
      .catch((err) => {
        // If we already showed cache, silently fail
        // If no cache, show error
        if (!cached) {
          onError("No connection and no local cache");
        }
      });
  } catch (e) {
    // BLE not available at all (e.g., phone disconnected)
    if (!cached) {
      onError("No connection and no local cache");
    }
  }
}
```

### What Gets Cached

| Request | Cache Key | What's Stored |
|---------|-----------|---------------|
| Watch/ folder listing | `GET_WATCH_NOTES:{}` | List of note names and paths |
| Root folders | `GET_ROOT_FOLDERS:{}` | Folder names and note counts |
| Any folder listing | `GET_FOLDER:{"path":"..."}` | Folder contents |
| Note blocks | `GET_NOTE_BLOCKS:{"path":"..."}` | Full parsed block array |

**Every screen you visit while online is automatically cached.** The next time you visit it offline, it loads instantly.

## The Offline Indicator

When the watch shows cached data, a small text appears:

```
Offline — cache local
```

This disappears when fresh data arrives. On the note view page, it shows at the top of the scrollable content.

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Never opened the app before, phone disconnected | Error: "No connection and no local cache" |
| Opened app yesterday, phone disconnected today | Shows yesterday's data with "Offline" label |
| Open app, phone connected, then disconnected mid-browse | Previously visited pages work, new pages fail |
| Note updated on server, phone disconnected | Shows old cached version until next sync |
| Phone reconnects while app is open | Next navigation fetches fresh data and updates cache |

## Storage Limits

Zepp OS `localStorage` has a size limit (varies by device, typically a few MB). If storage is full, `setCache` silently fails (wrapped in try/catch). The app continues working with whatever is already cached.

For typical use (50 notes, each producing ~20 blocks), total cache size is approximately 200–500 KB — well within limits.
