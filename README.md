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
- **calendar.html** — календарь (в разработке)

## Кнопки

На главной и внутренних страницах — белые овальные кнопки в стиле Sakura (`btn-hero`).

## GitHub Pages

Сайт деплоится автоматически при пуше в `main`. После настройки будет доступен по адресу:
**https://hellkiper.github.io/Statistics/**

Настройки: Repo → Settings → Pages → Source: Deploy from a branch → Branch: `gh-pages`.

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

1. Получите API ключ: [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)
2. Откройте `script.js` и вставьте ключ в переменную `STEAM_API_KEY`
3. Введите Steam ID или URL профиля в поле поиска

> **Примечание:** Steam API возвращает только базовую статистику (ISteamUserStats). Для матчей и детальной аналитики потребуется сторонний API (например, [SteamWebAPI](https://www.steamwebapi.com/)).

## Steam-авторизация

- Кнопка «Войти через Steam» в навигации
- После входа — отображаются аватар, имя и кнопка «Выйти»
- Сессия хранится в cookies

## Технологии

- HTML5, CSS3, JavaScript
- Node.js, Express, Passport, passport-steam
- Шрифт: Montserrat
