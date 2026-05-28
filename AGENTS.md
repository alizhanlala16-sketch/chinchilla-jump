# AGENTS.md — Chinchilla & Jump

> Этот файл — постоянная память проекта для AI-агента (Cursor). Загружается автоматически в каждой сессии через правило `.cursor/rules/project-context.mdc`.
> **При любом значимом изменении проекта — обязательно обновляй этот файл и `SESSION_LOG.md`.**
>
> **Безопасность:** этот файл и правила Cursor коммитятся в git (публичный репозиторий). НИКОГДА не записывай сюда токены, пароли, ключи API, личные данные. Если в чате мелькнули секреты — они идут только в `SESSION_LOG.md` (локальный, в `.gitignore`), и даже там лучше маскировать.

---

## 1. Что это за проект

**Chinchilla & Jump** — браузерная вертикальная аркада в духе Poor Bunny / Doodle Jump. Пушистая шиншилла прыгает по веткам волшебного леса, собирает сено, уворачивается от лис, пил и ножей.

- **Стек:** чистый HTML + CSS + JavaScript (без фреймворков, без сборки). Всё рисуется на `<canvas>`.
- **Хостинг:** Vercel — https://chinchilla-jump.vercel.app
- **GitHub:** https://github.com/alizhanlala16-sketch/chinchilla-jump (`origin/main`)
- **Авторы:** Жалгас Алижан и сестрёнка Айлана (отображается в кредитах на главной).
- **Лицензия:** MIT.
- **Платформы:** браузер (десктоп + мобильный портрет). В планах — iOS / Android (через PWA или нативку).

---

## 2. Структура файлов

| Файл | Назначение |
|---|---|
| `index.html` | Лендинг с анимированной заставкой и кнопками «Играть» / «О игре» |
| `game.html` | Страница самой игры — canvas 480×720, HUD, кнопки для мобайла, оверлеи |
| `about.html` | Описание механик, персонажей, управления, планы |
| `splash.js` | Анимация фона лендинга (шиншилла + лес + светлячки + звёзды) |
| `game.js` | Вся игровая логика и рендеринг (~3860 строк, одна IIFE) |
| `style.css` | Общие стили всех страниц (тёмная палитра, оранжево-золотой акцент) |
| `api/leaderboard.js` | Serverless API: GET/POST таблицы рекордов (Vercel Postgres) |
| `db/schema.sql` | SQL-схема таблицы `scores` |
| `package.json` | Зависимость `@vercel/postgres` для API |
| `vercel.json` | `cleanUrls: true`, `trailingSlash: false` |
| `deploy.ps1` | Деплой на Vercel через `vercel deploy --prod` с токеном из `.env` |
| `play.bat` | Локальный запуск (открывает `index.html`) |
| `.env` | `VERCEL_TOKEN`, `VERCEL_SCOPE` — **не коммитить!** |
| `.gitignore` | Игнорит `node_modules/`, `.vercel/`, `.env*`, логи |
| `.vercelignore` | Что не деплоить |

---

## 3. Игровая механика (state of truth)

### Игрок (шиншилла)
- Размер: 38×36. Спавн: центр экрана, `y = H - 140`.
- **Жизни:** 3 (сердечки в правом верхнем углу). Урон от лис/пил/ножей/сосулек — минус 1 жизнь + 90 кадров неуязвимости. Падение вниз за экран — мгновенный конец (если нет щита).
- **Прыжок:** `JUMP_FORCE = -11.8`, двойной — `-10.5`. В воздухе можно прыгнуть ещё раз.
- **Гравитация:** `GRAVITY = 0.55`, `MAX_FALL = 14`.
- **Скорость:** `MOVE_SPEED = 4.4`.
- При прыжке играется звук «фырк» (Web Audio).

### Платформы
- `PLATFORM_GAP = 82` пикселя между уровнями.
- Типы (в `PLATFORM_TYPES`):
  - **grass** — зелёная трава, не ломается
  - **log** — бревно, не ломается
  - **fragile** — хрупкая, ломается через 90 кадров после касания (за 50 кадров до — мигает), восстанавливается через 300 кадров (~5 сек)
  - **moving** — двигается влево-вправо, тащит игрока с собой через `deltaX`
- Платформы могут «выезжать» сбоку (`extending`).

### Бонусы и пауэр-апы
| Бонус | Эффект | Длительность | Шанс на платформу |
|---|---|---|---|
| **Сено** | +10 очков | — | 78% (40% на fragile) |
| **Яблоко** 🍎 | +1 жизнь | — | 2.5% |
| **Ракета** | летит вверх со скоростью `-8.5`, рушит врагов | 360 кадров (~6 сек) | 0.4% |
| **Щит** | поглощает удары, отбивает пилы, спасает от падения (телепорт на 3-ю платформу выше) | 1140 кадров (~19 сек) | 0.5% |
| **Лазеры из ушей** | два луча из ушей, уничтожают пилы, ножи, лис, белок | 900 кадров (~15 сек) | 0.4% |

Константы пауэр-апов (game.js строки 28–34):
```
ROCKET_DURATION = 360, ROCKET_LIFT = -8.5
SHIELD_DURATION = 1140, SHIELD_RESCUE_INDEX = 3
LASER_DURATION = 900, LASER_LENGTH = 1600, LASER_HALF_WIDTH = 6
```

### Враги и опасности
- **Пилы** — летают между стенами по краям. Спавн каждые ~600 пикселей высоты с шансом 55%. Шит/ракета отбивают, лазер уничтожает.
- **Лисы** — сидят у краёв, кидают ножи. Спавн каждые ~1100 пикселей высоты с шансом **60%** (был 35% — увеличен в коммите `c32489a`). С шансом 35% целятся в белок вместо игрока.
- **Ножи** — летят с заданной скоростью. Урон 1 жизнь. Щит/ракета поглощают, лазер уничтожает.
- **Белки** — сидят на ветках, прыгают между платформами. Не враги, но иногда становятся целью ножей.

### Темы фона (зацикленный цикл по высоте)
Массив `themeCycle` (строки 199–207):
```
forest 790 → sky 10 → space 200 → alien 780 → sky 10 → space 200 → forest 790
```
Между темами — мягкий fade. Функция `getThemeBlend(h)` возвращает текущее смешение `{a, b, t}`.

### Управление
- **ПК:** ←/→ или A/D — движение; Space / ↑ / W — прыжок; M — музыка вкл/выкл; клик мышью — прыжок.
- **Мобайл:** определяется через `(hover: none) and (pointer: coarse)`. Кнопки `#ctrl-jump` (слева), `#ctrl-left`/`#ctrl-right` (справа). На десктопе мобильные кнопки скрыты CSS.

### Скины и шляпы
- Выбор на стартовом экране `#overlay`: блок `.cosmetics-panel`.
- **Скины** (`CHIN_SKINS`, localStorage `chinchilla-skin`): `standard` (серая), `white` (белая), `black` (чёрная). Палитра через `getSkinPalette()` в `drawChinchilla()`.
- **Шляпы** (`CHIN_HATS`, localStorage `chinchilla-hat`): `none`, `gentleman` (цилиндр с красной лентой, `drawGentlemanHat()`).
- Функции: `setSelectedSkin`, `setSelectedHat`, `updateCosmeticUi`, `bindCosmeticButtons`.

### Режимы игры
- **Аркада** (`gameMode = "arcade"`) — бесконечный подъём, как раньше; результат в таблицу рекордов.
- **Уровни** (`gameMode = "levels"`) — фиксированные уровни с **порталом** в конце. Добравшись до портала → +50 сена, баннер, следующий уровень. Чередуются **вертикальные** (↑ прыжки вверх) и **горизонтальные** (→ бег/прыжки вправо, камера `cameraX`). Определения в `LEVEL_DEFS`, сборка — `buildVerticalLevel()` / `buildHorizontalLevel()`. Прогресс: `localStorage["chinchilla-level-progress"]`. Кнопки `#start-levels-btn` / `#start-arcade-btn`. В режиме уровней нет бесконечного спавна платформ и врагов (`ensurePlatforms` / `ensureHazards` отключены).

### Музыка
- Web Audio: pads (triangle) + бас + хэт + снейр + кик + лид. Прогрессия из 4 аккордов.
- Громкость `MUSIC_VOLUME = 0.045`. Запуск — по первому клику/нажатию/тапу.

### Рекорд и таблица рекордов
- **Best score** (общий рекорд в HUD) — `localStorage["chinchilla-best"]` (просто число).
- **Имя игрока** — `localStorage["chinchilla-player-name"]` (до 16 символов). Поле `#player-name-input` на стартовом экране `#overlay`; сохраняется при blur и перед стартом игры. Модал `#name-prompt` — только для «Сменить имя» с экрана проигрыша (когда меню скрыто).
- **Глобальная таблица** — PostgreSQL на Vercel (`scores`: `name`, `score`, `height`, `created_at`). API `GET/POST /api/leaderboard`, топ-100 результатов + `totalPlayers` (уникальные имена). Таблица создаётся автоматически при первом запросе (`api/leaderboard.js`).
- **Локальный fallback** — `localStorage["chinchilla-leaderboard"]`, если API недоступен (нет `POSTGRES_URL`, оффлайн, локальный `file://`).
- **Клиент:** `fetchLeaderboardFromServer()`, `saveScoreAsync()`, кэш `leaderboardCache`. Статус в `#leaderboard-status`: «Онлайн · игроков в базе: N» или «Оффлайн · …».
- **Кнопки «🏆 Рекорды»** — стартовое меню и экран проигрыша. «Сменить имя» / «Закрыть» в модалке.
- На экране проигрыша: «Место в таблице: N из M» (M = число игроков в базе при онлайн-режиме).

---

## 4. Архитектура `game.js`

Файл — одна большая IIFE. Разделы:

1. **Setup (1–98):** константы, refs к DOM, ключевые переменные, объект `player`.
2. **Decor (99–230):** деревья, облака, звёзды, небулы, мухоморы; темы (`themeCycle`, `getThemeBlend`).
3. **Spawn / reset (233–423):** `resetGame`, `pickPlatformType`, `spawnPlatform`, `ensurePlatforms`.
4. **Audio (425–494):** Web Audio контекст и SFX «фырк».
5. **Input / particles (496–605):** `jump`, `spawnDust`, `spawnDoubleJumpRing`, `spawnSparkles`, `spawnRespawnBurst`, `spawnPlatformBreak`.
6. **Hazards (607–798):** `ensureHazards`, `updateSaws`, `updateFoxes`, `updateSquirrels`, `updateKnives`.
7. **Physics (800–943):** `updatePlatforms`, `updatePlayer` (коллизии, камера, падение).
8. **Items (945–986):** `updateHays`, `updateParticles`, `updateBackgroundLeaves`, `updateHud`.
9. **State / music / leaderboard (988–~1400):** `endGame`, лидерборд (local + `/api/leaderboard`), `startMusic`, `toggleMusic`, `setPlayingUi`, `startGame`/`actuallyStartGame`.
10. **Rendering BG (1246–1554):** темы (`drawForestBg`, `drawSkyBg`, `drawSpaceBg`, `drawAlienBg`), деревья, листья.
11. **Render entities (1555–3733):** `drawPlatforms`, `drawHay`, `drawChinchilla` (~250 строк sprite), `drawApples`, `drawRockets`, `drawShields`, `drawLasers`, `drawSaws`, `drawFoxes`, `drawSquirrels`, `drawKnives`, `drawLives`, `drawPowerupTimers`.
12. **Damage / rescue (2245–2376):** `damagePlayer`, `rescueWithShield`, `spawnShieldHit`, `spawnRocketTrail`.
13. **Lasers (2759–3014):** `updateLasers`, `getLaserBeams`, `pointHitsBeam`, `processLaserHits`, `drawLasers`, `drawLaserBeams`.
14. **Main loop (3735–3780):** `render`, `update`, `loop`.
15. **Input bindings (3782–3863):** клавиатура, тач, мышь, мобильные кнопки.

---

## 5. История изменений (git log)

| Хеш | Дата | Что |
|---|---|---|
| `c32489a` | 2026-05-28 | Лисы спавнятся чаще (интервал 2200→1100, шанс 35%→60%) |
| `7279f1a` | 2026-05-28 | Снижен шанс супер-бонусов (ракета/щит 1.2%, лазер 1.0%) |
| `9b53ecb` | 2026-05-28 | Каждый супер-бонус = 3% на платформу |
| `f231977` | 2026-05-27 | Увеличены шансы супер-бонусов (~2.3×–2.4×) |
| `7c5eeb0` | 2026-05-27 | **Добавлен лазер из ушей (15 сек)**, испепеляет пилы/ножи/лис/белок |
| `47029d6` | 2026-05-27 | Щит/ракета визуально отбивают пилы и рушат ножи |
| `7712d13` | 2026-05-27 | **Добавлены ракета (6с) и щит (19с)** |
| `e0808b6` | 2026-05-27 | Фикс: следы на фоне через полностью непрозрачную тему |
| `aa313f4` | 2026-05-27 | **Циклические темы: forest → sky → space → alien** |
| `a318c55` | 2026-05-27 | Мобильные кнопки только на тач-устройствах |
| `de9053e` | 2026-05-27 | Кредиты только на главной |
| `9f57126` | 2026-05-27 | **Добавлены кредиты:** Жалгас Алижан и сестрёнка Айлана |
| `fd1cc53` | 2026-05-27 | Live-бейдж в README |
| `3ddc94c` | 2026-05-27 | Удалён test.txt |
| `a2d10a4` | 2026-05-27 | **Initial commit: Chinchilla and Jump v1.0** |

---

## 6. Деплой

```powershell
.\deploy.ps1
```
Скрипт читает `.env` (где `VERCEL_TOKEN`, опционально `VERCEL_SCOPE=alizhan-s-projects2`), добавляет Node.js в PATH и запускает `vercel deploy --prod --yes --scope $scope`.

Альтернативно — push в `main` на GitHub запускает авто-деплой через Vercel Git Integration.

### База данных (таблица рекордов)

1. Vercel Dashboard → проект **chinchilla-jump** → **Storage** → **Create Database** → **Postgres** (Neon).
2. Подключить базу к проекту — Vercel сам добавит `POSTGRES_URL` в Environment Variables.
3. Задеплоить заново (push в `main` или `.\deploy.ps1`).
4. Таблица `scores` создаётся автоматически при первом запросе к `/api/leaderboard`. SQL вручную: `db/schema.sql`.

Без `POSTGRES_URL` игра работает, но таблица только локальная (localStorage на устройстве).

---

## 7. Договорённости и стиль кода

- **Без сборщиков, без зависимостей.** Всё пишется в один `game.js`, ссылки на DOM — через `getElementById`.
- **IIFE + `"use strict"`** во избежание глобалов.
- **Все размеры от констант** `W`, `H`, `PLATFORM_GAP`, `GRAVITY` и т.п. — не хардкодить числа произвольно.
- **Новые сущности** добавляются по схеме: массив + spawn-функция + update-функция + draw-функция, вызывать из `update()` и `render()`.
- **Локализация:** все тексты UI — на русском. README/AGENTS — тоже на русском.
- **Коммиты:** короткие английские заголовки в стиле `Add X`, `Fix Y`, `Reduce Z spawn rates`.
- **Анимация:** 60 FPS через `requestAnimationFrame`, все длительности в кадрах (а не в мс).
- **Звуки:** только через Web Audio, без `<audio>`-тегов и внешних файлов.

---

## 8. Известные особенности / гайды для будущих изменений

- **Балансировка спавна** — менять константы в `spawnPlatform` (шансы бонусов) и в `ensureHazards` (интервалы и шансы лис/пил).
- **Новая тема фона** — добавить запись в `themeCycle`, написать `drawXxxBg()`, добавить case в `drawTheme()`.
- **Новый враг** — массив + `ensureHazards` + `updateX()` + `drawX()` + вызовы в `update()`/`render()`. Не забыть про коллизии с лазером в `processLaserHits()` и про щит/ракету.
- **Новый пауэр-ап** — массив + spawn в `spawnPlatform` + `updateX()`/`drawX()` + поле `xTimer` на `player` + сброс в `resetGame` + иконка таймера в `drawPowerupTimers`.
- **Канвас фиксирован 480×720**, но `#game-wrapper` в CSS подгоняет соотношение под экран.

---

## 9. Что в `SESSION_LOG.md`

Хронологический журнал всех сессий с AI-агентом: что обсуждалось, что было решено, что было сделано. Обновляется **в конце каждой сессии** перед завершением работы.
