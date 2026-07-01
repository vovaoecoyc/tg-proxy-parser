# TG Proxy Parser — План реализации

## Цель
Веб-приложение для парсинга MTProto прокси из репозитория [SoliSpirit/mtproto](https://github.com/SoliSpirit/mtproto) и проверки их доступности.

## Стек
- **Backend**: Node.js + Hono
- **Frontend**: React (Vite)
- **Git операции**: simple-git
- **Проверка прокси**: net.Socket (TCP) + MTProto handshake

## Структура проекта

```
tg-proxy-parser/
├── server/
│   ├── index.js                  # Hono сервер
│   ├── routes/
│   │   └── proxies.js            # API роуты
│   ├── services/
│   │   ├── gitService.js         # Git операции
│   │   ├── proxyLoader.js        # Загрузка прокси
│   │   └── proxyChecker.js       # Проверка прокси
│   └── utils/
│       └── proxyParser.js        # Парсинг ссылок
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ProxyList.jsx
│   │   │   ├── ProxyItem.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── FilterToggle.jsx
│   │   └── hooks/
│   │       └── useProxies.js
│   └── index.html
├── package.json
└── plan.md
```

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/proxies` | Все прокси из файла |
| GET | `/api/proxies/new` | Новые прокси из git diff |
| POST | `/api/proxy/:id/check` | Проверить один прокси |
| POST | `/api/proxies/check-all` | Проверить все прокси |

## Формат прокси

```json
{
  "id": "md5(server:port:secret)",
  "server": "87.248.129.174",
  "port": 443,
  "secret": "ee1603...",
  "link": "https://t.me/proxy?server=...&port=...&secret=...",
  "status": "unknown|checking|online|offline",
  "lastChecked": "2026-06-30T12:00:00Z"
}
```

## Задачи

### Task 1: Инициализация проекта
- `npm init`
- Установка зависимостей: hono, @hono/node-server, simple-git, nodemon
- Создание Vite React приложения в `client/`
- Базовый сервер в `server/index.js`
- Базовый фронтенд в `client/src/App.jsx`

### Task 2: Утилита парсинга прокси
- `server/utils/proxyParser.js`
- Функции: `parseProxyLink(link)`, `generateId(server, port, secret)`
- Парсинг tg:// и https://t.me/proxy?... ссылок

### Task 3: Сервис для Git операций
- `server/services/gitService.js`
- Функции: `initRepo()`, `updateRepo()`, `getNewProxies()`
- Клонирование репозитория, pull, diff для получения новых прокси

### Task 4: Сервис загрузки прокси
- `server/services/proxyLoader.js`
- Функции: `loadAllProxies()`, `loadNewProxies()`
- Чтение файла, парсинг, создание объектов прокси

### Task 5: Сервис проверки прокси
- `server/services/proxyChecker.js`
- Функции: `checkTcp(server, port)`, `checkMtproto(server, port, secret)`, `checkProxy(proxy)`
- Двухуровневая проверка: TCP + MTProto handshake

### Task 6: API роуты
- `server/routes/proxies.js`
- GET `/api/proxies` — все прокси
- GET `/api/proxies/new` — новые из git diff
- POST `/api/proxy/:id/check` — проверка одного
- POST `/api/proxies/check-all` — проверка всех
- Кэширование результатов проверки

### Task 7: React компоненты
- `client/src/hooks/useProxies.js` — хук для работы с API
- `client/src/components/FilterToggle.jsx` — переключатель All/New
- `client/src/components/StatusBadge.jsx` — индикатор статуса
- `client/src/components/ProxyItem.jsx` — элемент списка
- `client/src/components/ProxyList.jsx` — список прокси
- Обновление `client/src/App.jsx` и `client/src/index.css`

### Task 8: Настройка Vite
- `client/vite.config.js` — прокси для API запросов

### Task 9: Скрипты сборки
- Обновление `package.json` с scripts: start, dev, dev:client, build

### Task 10: Интеграционное тестирование
- Проверка запуска сервера
- Проверка работы фронтенда
- Тестирование всех функций

## Проверка прокси

### Уровень 1: TCP (быстрый)
- `net.Socket.connect(server, port)` с таймаутом 5 сек
- Port open = online, timeout/error = offline

### Уровень 2: MTProto (по запросу)
- Обфусцированный initial handshake
- Ожидание валидного ответа
- Таймаут 10 сек

## Frontend дизайн

- Единый список с переключателем All Proxies / New Proxies
- Таблица: Server | Port | Status | Actions
- Статус: 🟢 online, 🔴 offline, ⚪ unknown, 🟡 checking
- Кнопки: Check у каждого, Check All сверху
- Клик по строке — копирование ссылки
