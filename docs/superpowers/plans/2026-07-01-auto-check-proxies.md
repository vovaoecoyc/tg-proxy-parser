# Auto-check proxies on page load — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically check all proxy statuses on page load using batched parallelism with progress indication.

**Architecture:** Client fetches proxy list, then fires batched `POST /api/proxies/check-batch` requests with concurrency limit of 5. Server accepts batch of IDs, runs `checkProxy()` on each, returns results. UI shows progress bar during auto-check.

**Tech Stack:** Hono (server), React 19 (client), no new dependencies.

## Global Constraints

- ESM everywhere — `"type": "module"`, use `.js` extensions in imports
- No database — proxies cached in-memory on server
- Lint: `cd client && npm run lint`
- Batch size: 20 proxies per request
- Concurrency: 5 parallel batches
- Priority: first visible items in UI checked first (natural array order)

---

### Task 1: Add `POST /api/proxies/check-batch` endpoint

**Files:**
- Modify: `server/routes/proxies.js`

**Interfaces:**
- Consumes: existing `proxiesCache`, `checkProxy()` from `../services/proxyChecker.js`
- Produces: `POST /api/proxies/check-batch` accepting `{ ids: string[] }`, returning `Proxy[]` with updated statuses

- [ ] **Step 1: Add the batch endpoint to `server/routes/proxies.js`**

Add after the existing `/proxies/check-all` route (after line 53):

```js
proxiesRouter.post('/proxies/check-batch', async (c) => {
  const { ids } = await c.req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return c.json({ error: 'ids must be a non-empty array' }, 400);
  }

  if (proxiesCache.length === 0) {
    proxiesCache = loadAllProxies();
  }

  const proxiesToCheck = proxiesCache.filter(p => ids.includes(p.id));
  const results = await Promise.all(proxiesToCheck.map(p => checkProxy(p)));

  for (const result of results) {
    const idx = proxiesCache.findIndex(p => p.id === result.id);
    if (idx !== -1) proxiesCache[idx] = result;
  }

  return c.json(results);
});
```

- [ ] **Step 2: Verify the endpoint manually**

Start the server with `npm run dev`, then test with curl or browser dev tools:
```
POST http://localhost:3000/api/proxies/check-batch
Content-Type: application/json
Body: { "ids": ["<some-proxy-id>"] }
```
Expected: JSON array with one proxy object containing `status` and `lastChecked` fields.

- [ ] **Step 3: Commit**

```bash
git add server/routes/proxies.js
git commit -m "feat: add POST /api/proxies/check-batch endpoint"
```

---

### Task 2: Add batch utility functions to useProxies hook

**Files:**
- Modify: `client/src/hooks/useProxies.js`

**Interfaces:**
- Produces: `chunk(array, size)` — splits array into chunks of given size
- Produces: `runWithConcurrency(tasks, limit, fn)` — runs task items with bounded parallelism

- [ ] **Step 1: Add `chunk` and `runWithConcurrency` helper functions**

Add at the top of `client/src/hooks/useProxies.js`, after the imports (before the `useProxies` function):

```js
function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function runWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const result = await fn(items[currentIndex], currentIndex);
      results.push(result);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}
```

- [ ] **Step 2: Run lint to verify no syntax errors**

Run: `cd client && npm run lint`
Expected: no errors related to the new functions.

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/useProxies.js
git commit -m "feat: add chunk and runWithConcurrency utilities"
```

---

### Task 3: Add auto-check logic to useProxies hook

**Files:**
- Modify: `client/src/hooks/useProxies.js`

**Interfaces:**
- Consumes: `chunk()`, `runWithConcurrency()` from Task 2
- Consumes: `POST /api/proxies/check-batch` endpoint from Task 1
- Produces: `autoCheckProgress: { checked: number, total: number } | null` state
- Produces: auto-check triggered automatically after `fetchAllProxies()` in `useEffect`

- [ ] **Step 1: Add `autoCheckProgress` state and `autoCheckAll` function**

Add state declaration after the existing `useState` declarations (after line 9):

```js
const [autoCheckProgress, setAutoCheckProgress] = useState(null);
```

Add the `autoCheckAll` function inside the hook, after `checkAllProxies` (after line 72):

```js
const autoCheckAll = async (proxiesToCheck) => {
  if (proxiesToCheck.length === 0) return;

  const BATCH_SIZE = 20;
  const CONCURRENCY = 5;
  const ids = proxiesToCheck.map(p => p.id);
  const batches = chunk(ids, BATCH_SIZE);

  setCheckingIds(new Set(ids));
  setAutoCheckProgress({ checked: 0, total: ids.length });

  let checked = 0;

  await runWithConcurrency(batches, CONCURRENCY, async (batchIds) => {
    try {
      const response = await fetch(`${API_BASE}/proxies/check-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: batchIds }),
      });
      const results = await response.json();

      setProxies(prev => {
        const map = new Map(prev.map(p => [p.id, p]));
        for (const r of results) map.set(r.id, r);
        return Array.from(map.values());
      });
      setNewProxies(prev => {
        const map = new Map(prev.map(p => [p.id, p]));
        for (const r of results) map.set(r.id, r);
        return Array.from(map.values());
      });

      checked += results.length;
      setAutoCheckProgress(prev => ({ ...prev, checked }));
    } catch (error) {
      console.error('Batch check failed:', error);
      checked += batchIds.length;
      setAutoCheckProgress(prev => ({ ...prev, checked }));
    }
  });

  setCheckingIds(new Set());
  setAutoCheckProgress(null);
};
```

- [ ] **Step 2: Wire auto-check into the `useEffect`**

Replace the existing `useEffect` (lines 74-77):

```js
useEffect(() => {
  let cancelled = false;

  const init = async () => {
    try {
      const response = await fetch(`${API_BASE}/proxies`);
      const data = await response.json();
      if (cancelled) return;
      setProxies(data);

      await autoCheckAll(data);
    } catch (error) {
      console.error('Failed to fetch proxies:', error);
    }
  };

  init();

  fetchNewProxies();

  return () => { cancelled = true; };
}, []);
```

- [ ] **Step 3: Add `autoCheckProgress` to the return object**

Update the return statement to include `autoCheckProgress`:

```js
return {
  proxies: currentProxies,
  filter,
  setFilter,
  checkingIds,
  checkProxy,
  checkAllProxies,
  autoCheckProgress,
  refresh: () => {
    fetchAllProxies();
    fetchNewProxies();
  },
};
```

- [ ] **Step 4: Run lint**

Run: `cd client && npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useProxies.js
git commit -m "feat: add auto-check on page load with batched parallelism"
```

---

### Task 4: Add progress indicator UI

**Files:**
- Modify: `client/src/App.jsx`
- Modify: `client/src/App.css`

**Interfaces:**
- Consumes: `autoCheckProgress` from `useProxies` hook (Task 3)

- [ ] **Step 1: Destructure `autoCheckProgress` from the hook**

In `client/src/App.jsx`, update the hook destructuring (line 8):

```js
const { proxies, filter, setFilter, checkingIds, checkProxy, checkAllProxies, autoCheckProgress } = useProxies();
```

- [ ] **Step 2: Add progress indicator to the JSX**

In `client/src/App.jsx`, add the progress bar after the `<div className="controls">` block (after line 30), before the toast:

```jsx
{autoCheckProgress && (
  <div className="auto-check-progress">
    <div className="progress-text">
      Проверено: {autoCheckProgress.checked} / {autoCheckProgress.total}
    </div>
    <div className="progress-bar">
      <div
        className="progress-bar-fill"
        style={{ width: `${(autoCheckProgress.checked / autoCheckProgress.total) * 100}%` }}
      />
    </div>
  </div>
)}
```

- [ ] **Step 3: Disable "Check All" button during auto-check**

In `client/src/App.jsx`, update the button's `disabled` prop (line 27):

```jsx
disabled={checkingIds.size > 0 || !!autoCheckProgress}
```

- [ ] **Step 4: Add progress bar styles**

In `client/src/App.css`, add before the `.proxy-table-wrapper` rule (before line 77):

```css
.auto-check-progress {
  margin-bottom: 16px;
}

.progress-text {
  font-size: 14px;
  color: #aaa;
  margin-bottom: 6px;
}

.progress-bar {
  height: 6px;
  background: #3a3a4e;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #2d6a4f;
  border-radius: 3px;
  transition: width 0.3s ease;
}
```

- [ ] **Step 5: Run lint**

Run: `cd client && npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add client/src/App.jsx client/src/App.css
git commit -m "feat: add progress indicator for auto-check"
```

---

### Task 5: Build and verify end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Build the client**

Run: `npm run build`
Expected: successful build with no errors.

- [ ] **Step 2: Start the server and verify**

Run: `npm start`, open `http://localhost:3000`
Expected:
- Page loads, proxy list appears
- Progress bar appears immediately showing "Проверено: 0 / N"
- Proxies update progressively with online/offline statuses
- Progress bar fills and disappears when done
- "Check All" button is disabled during auto-check, enabled after

- [ ] **Step 3: Run client lint one final time**

Run: `cd client && npm run lint`
Expected: no errors.

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: final adjustments after end-to-end verification"
```
