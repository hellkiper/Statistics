# Sakura CS2

Многостраничный сайт со статистикой Counter-Strike 2 в стиле Sakura.

## Страницы

- **index.html** — главная с hero-секцией и кнопками «статистика» / «история матчей»
- **statistics.html** — полная статистика (K/D, оружие, карты)
- **matches.html** — история матчей
- **grenades.html** — гранаты (в разработке)
- **maps.html** — предматчевая аналитика по картам
- **sakura.html** — о проекте
- **tactics.html** — тактическая доска (в разработке)
- **sets.html** — собери сет (в разработке)
- **giveaway.html** — розыгрыш (в разработке)
- **videos.html** — Sakura Videos (в разработке)

## Кнопки

На главной и внутренних страницах — белые овальные кнопки в стиле Sakura (`btn-hero`).

## Деплой с авторизацией через Steam (Render)

**Регистрация через Steam работает на Render** — там запускается Node.js сервер.

1. Зайди на [render.com](https://render.com), зарегистрируйся через GitHub
2. New → Web Service → подключи репозиторий `hellkiper/Statistics`
3. Environment → добавь:
   - `STEAM_API_KEY` — ключ с [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
   - `FACEIT_API_KEY` — для Faceit-статистики (опционально)
   - `BASE_URL` — оставь пустым (Render подставит URL сам)
4. Deploy
5. После деплоя — зайди в настройки Steam API ключа и добавь домен вида `https://твой-сервис.onrender.com`

Сайт будет по ссылке вида `https://sakura-cs2-xxx.onrender.com` — там работает вход через Steam и реальная статистика.

## GitHub Pages (статическая версия)

Сайт деплоится автоматически при пуше в `main`. URL: **https://hellkiper.github.io/Statistics/**

**Настройки:** Repo → Settings → Pages → Source: **GitHub Actions**

> На GitHub Pages только статика — без входа через Steam. Для авторизации используй Render (см. выше).

## Запуск локально

**С авторизацией через Steam**:

```bash
npm install
cp .env.example .env
# STEAM_API_KEY в .env: https://steamcommunity.com/dev/apikey
npm start
```

**Статика** — открой `index.html` или используй любой статический сервер.

## Реальные данные (Steam API)

Ключ хранится в `.env` (локально) или в Environment на Render. Статистика подгружается через API прокси на сервере.

## Steam-авторизация

- Кнопка «Войти через Steam» в навигации
- После входа — отображаются аватар, имя и кнопка «Выйти»
- Сессия хранится в cookies

## Технологии

- HTML5, CSS3, JavaScript
- Node.js, Express, Passport, passport-steam
- Шрифт: Montserrat
