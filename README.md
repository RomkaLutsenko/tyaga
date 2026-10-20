# Tyaga

Витрина Telegram Mini App: поиск, фильтры и подбор табака и жидкостей. Покупок, аккаунтов и цен нет.

## Запуск

```bash
cp .env.example .env
npm install
docker compose up -d
npx prisma migrate dev
npm run catalog:seed-mock -- 1000 42
npm run dev
```

Бот: `npm run bot` (нужны `BOT_TOKEN` и `WEBAPP_URL`).

`ACCESS_MODE=open` открывает витрину в браузере. Значение `telegram_only` требует подпись Telegram. Если переменная пустая или неизвестная, сервис стартует в `telegram_only`.

Импорт каталога: `npm run catalog:import -- file.csv --create-missing`.

## Проверки

```bash
npm test
npm run test:e2e
npm run bench:catalog
```

`@telegram-apps/telegram-ui` не подключён: пакет требует React 18, проект на React 19. Экраны собраны на Tailwind и цветах `--tg-theme-*`.

## GitHub Pages

Статическая витрина не использует PostgreSQL: каталог из тысячи позиций собирается в браузере тем же генератором, что и локальный mock. Сборка: `npm run build:pages`. Адрес после выкладки: `https://romkalutsenko.github.io/tyaga/`.
