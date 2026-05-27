[![Live](https://img.shields.io/badge/play-online-orange)](https://chinchilla-jump.vercel.app)

# Chinchilla & Jump

Браузерная вертикальная аркада: пушистая шиншилла прыгает по веткам волшебного леса, собирает сено и уворачивается от лис, пил и ледяных сосулек.

## Структура

- `index.html` — приветственная страница с анимированной заставкой
- `about.html` — описание игры, механик и планов
- `game.html` — сама игра
- `splash.js` — анимация фона приветственной страницы (canvas)
- `game.js` — логика и рендеринг игры (canvas)
- `style.css` — общие стили для всех страниц
- `vercel.json` — конфигурация хостинга

## Запуск локально

Достаточно открыть `index.html` в браузере (двойной клик или `play.bat` в Windows).

## Деплой на Vercel (бесплатно)

### Вариант A — Drag & Drop (быстрее всего, без аккаунта Git)

1. Зайти на [vercel.com](https://vercel.com/), зарегистрироваться (через GitHub/Google/email).
2. На дашборде нажать **Add New → Project**.
3. В блоке *Clone Template* или внизу — выбрать **Deploy a project without Git** / *Continue with template* → найти **"Other"** (или сразу `vercel deploy` из CLI).
4. Альтернатива: `npx vercel` в этой папке (нужен Node.js + npm локально).

### Вариант B — через GitHub (рекомендуется для обновлений)

1. Создать репозиторий на GitHub и залить туда содержимое папки.
2. В Vercel: **Add New → Project → Import Git Repository** → выбрать репозиторий.
3. Framework Preset: **Other** (статический сайт).
4. Build Command: пусто, Output Directory: `./`.
5. Нажать **Deploy** — через ~30 сек получаешь URL вида `chinchilla-jump.vercel.app`.

### Вариант C — Netlify Drop (ещё проще)

1. Открыть [app.netlify.com/drop](https://app.netlify.com/drop).
2. Перетащить всю папку проекта в окно браузера.
3. Готово — сразу получаешь публичный URL.

## Управление

- **← →** или **A D** — движение
- **Пробел** / **↑** / **W** — прыжок (двойной прыжок в воздухе)

## Планы

- Версия для iOS (App Store)
- Версия для Android (Google Play)
- Новые миры: зимний бор, пещеры, небесные ветки

## Лицензия

MIT