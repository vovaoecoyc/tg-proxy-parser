# TG Proxy Parser — Контекст проекта

## Обзор
Веб-приложение для парсинга MTProto прокси из GitHub репозитория и проверки их доступности.

## Стек технологий
- **Backend**: Node.js + Hono
- **Frontend**: React (Vite)
- **Git операции**: simple-git
- **Проверка прокси**: net.Socket (TCP) + MTProto handshake

## Источник данных
- **Репозиторий**: https://github.com/SoliSpirit/mtproto.git
- **Файл прокси**: all_proxies.txt (150+ прокси)
- **Формат**: `https://t.me/proxy?server=87.248.129.174&port=443&secret=ee1603...`

## Ключевые решения

### Стек
- Hono вместо Express (по запросу пользователя)
- React + Vite для фронтенда

### Источник данных
- Локальный git clone репозитория
- Чтение файла all_proxies.txt
- Git diff для получения новых прокси

### Проверка прокси
- Двухуровневая: TCP + MTProto handshake
- TCP: быстрый (5 сек таймаут)
- MTProto: точный (10 сек таймаут)

### UI
- Единый список прокси
- Переключатель All/New (не вкладки)
- Копирование ссылки по клику
- Статус: 🟢 online, 🔴 offline, ⚪ unknown, 🟡 checking

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/proxies` | Все прокси из файла |
| GET | `/api/proxies/new` | Новые прокси из git diff |
| POST | `/api/proxy/:id/check` | Проверить один прокси |
| POST | `/api/proxies/check-all` | Проверить все прокси |

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
├── plan.md
└── context.md
```

## Деплой
- Railway или Render (бесплатно)
- Build: `npm run build`
- Start: `npm start`

## Текущий статус
- Git инициализирован
- plan.md создан и закоммичен
- Готов к реализации Task 1
