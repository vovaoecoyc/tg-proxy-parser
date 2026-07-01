# Auto-check proxies on page load

## Goal

When the user opens the page, all proxies are automatically checked for availability. Checking runs in batches with controlled parallelism, starting from the first visible items in the UI. A progress indicator shows how many proxies have been checked.

## Current state

- `GET /api/proxies` returns proxies from file (cached in memory) without status checks
- `POST /api/proxy/:id/check` checks a single proxy (TCP + MTProto handshake)
- `POST /api/proxies/check-all` checks all proxies concurrently via `Promise.all` — fires 150+ TCP connections at once
- Frontend fetches proxies on mount but does NOT trigger any status checks
- Proxies have no status until user manually clicks "Check" or "Check All"

## Design

### 1. Server: new endpoint `POST /api/proxies/check-batch`

**File:** `server/routes/proxies.js`

Accepts JSON body `{ ids: string[] }`. Returns array of checked proxies with updated statuses.

```
POST /api/proxies/check-batch
Body: { "ids": ["abc123", "def456", ...] }
Response: [{ id, server, port, secret, status, lastChecked, ... }, ...]
```

Implementation:
- Filter `proxiesCache` by provided IDs
- `Promise.all` the filtered proxies through existing `checkProxy()`
- Update cache entries with results
- Return only the checked subset (not the entire list)

### 2. Client: auto-check with batched parallelism

**File:** `client/src/hooks/useProxies.js`

After `fetchAllProxies()` resolves, automatically start checking all proxies in batches:

- **Batch size:** 20 proxies per request
- **Concurrency:** 5 parallel batches (up to 100 simultaneous TCP connections)
- **Priority:** first batch contains the first 20 proxies in the list (the ones visible in UI via virtualizer), then subsequent batches follow in order

Flow:
1. `fetchAllProxies()` completes → get full proxy list
2. Sort proxy IDs in display order (first items first)
3. Split into chunks of 20
4. Launch pool of 5 concurrent workers, each processing one batch at a time
5. After each batch completes, update `proxies` state with results (progressive UI update)
6. Track `autoCheckProgress: { checked, total }` for progress indicator
7. When all batches done, clear progress state

Utility functions needed:
- `chunk(array, size)` — splits array into chunks
- `runWithConcurrency(tasks, limit, fn)` — runs tasks with controlled concurrency

### 3. UI: progress indicator

**File:** `client/src/App.jsx`

While auto-check is running:
- Show progress text: "Проверено: 45 / 150" with a progress bar
- Disable "Check All" button during auto-check
- Individual proxies show `checking` status via existing `StatusBadge`

When auto-check completes:
- Progress indicator disappears
- "Check All" button becomes enabled again

### 4. Edge cases

- **Empty proxy list:** skip auto-check
- **Request fails for a batch:** log error, continue with remaining batches, don't block UI
- **User navigates away / remounts:** abort via `AbortController` in useEffect cleanup
- **User clicks "Check All" during auto-check:** disabled (button is disabled during auto-check)

## Files to modify

| File | Change |
|------|--------|
| `server/routes/proxies.js` | Add `POST /proxies/check-batch` endpoint |
| `client/src/hooks/useProxies.js` | Add auto-check logic, batch utilities, progress state |
| `client/src/App.jsx` | Add progress indicator UI |
| `client/src/App.css` | Styles for progress bar |

## No changes needed

- `server/services/proxyChecker.js` — reused as-is
- `client/src/components/ProxyList.jsx` — no changes (already handles `checkingIds`)
- `client/src/components/ProxyItem.jsx` — no changes (already shows spinner for checking status)
- `client/src/components/StatusBadge.jsx` — no changes (already has `checking` state)
