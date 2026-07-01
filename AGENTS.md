# TG Proxy Parser — Agent Instructions

## Commands

| Task | Command | Notes |
|------|---------|-------|
| Start backend | `npm run dev` | nodemon on `server/index.js`, port 3000 |
| Start frontend | `npm run dev:client` | Vite dev server, proxies `/api` → localhost:3000 |
| Build frontend | `npm run build` | Outputs to `client/dist/` |
| Production start | `npm start` | Serves `client/dist/` via Hono static middleware |
| Client lint | `cd client && npm run lint` | oxlint only, no tscheck |

Run backend + frontend in parallel terminals during development. There is no single "npm run dev" that starts both.

## Architecture

- **Backend**: Hono on Node.js (`server/`). Entry: `server/index.js`.
- **Frontend**: React + Vite (`client/`). Entry: `client/src/main.jsx` → `App.jsx`.
- **No database** — proxies are cached in-memory in `server/routes/proxies.js`. Restarting the server clears all check results.
- **Data source**: On startup, `initRepo()` clones/pulls `https://github.com/SoliSpirit/mtproto.git` into `./mtproto-repo/`. Proxy links come from `mtproto-repo/all_proxies.txt`.
- **ESM everywhere** — `"type": "module"` in both `package.json` files. Use `.js` extensions in imports.

## Key Directories

```
server/
  index.js            — Hono app, static file serving, repo init on start
  routes/proxies.js   — API routes, in-memory proxy cache
  services/gitService.js  — clone/pull, git diff for new proxies
  services/proxyChecker.js — TCP + MTProto handshake check
  services/proxyLoader.js  — parse all_proxies.txt
  utils/proxyParser.js    — parse t.me/proxy URL into {server, port, secret}

client/
  src/App.jsx         — main component
  src/components/     — ProxyList, ProxyItem, StatusBadge, FilterToggle
  src/hooks/useProxies.js — API calls
```

## Gotchas

- `npm run build` only builds the client. Production requires `npm run build` then `npm start`.
- The `/api/proxies/check-all` endpoint fires 150+ concurrent TCP connections via `Promise.all`. This may exhaust file descriptors on constrained hosts.
- `mtproto-repo/` is a git clone created at runtime — do not commit it.
- The server reuses `simple-git` instances; `gitService.js` reassigns the `git` variable on each call rather than keeping a persistent instance.
