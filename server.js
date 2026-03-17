const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.set('trust proxy', 1);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (origin.includes('render.com') || origin.includes('github.io') || origin.startsWith('http://localhost'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Steam API ключ — получи на https://steamcommunity.com/dev/apikey
const STEAM_API_KEY = process.env.STEAM_API_KEY || '';
// Faceit API — https://developers.faceit.com/
const FACEIT_API_KEY = process.env.FACEIT_API_KEY || '';
// BALLDONTLIE CS2 — https://app.balldontlie.io/ (бесплатный ключ)
const BALLDONTLIE_API_KEY = process.env.BALLDONTLIE_API_KEY || '';

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

const steamOptions = {
  returnURL: `${BASE_URL}/auth/steam/return`,
  realm: `${BASE_URL}/`
};
if (STEAM_API_KEY) {
  steamOptions.apiKey = STEAM_API_KEY;
} else {
  steamOptions.profile = false;
}

passport.use(new SteamStrategy(steamOptions, (identifier, profile, done) => {
  const steamId = identifier.replace('https://steamcommunity.com/openid/id/', '');
  return done(null, {
    steamId,
    name: profile?.displayName || `Steam User ${steamId.slice(-4)}`,
    avatar: profile?.photos?.[2]?.value || profile?.photos?.[1]?.value || ''
  });
}));

app.use(session({
  secret: process.env.SESSION_SECRET || 'sakura-cs2-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname)));

app.get('/auth/steam', passport.authenticate('steam'));

app.get('/auth/steam/return',
  passport.authenticate('steam', { failureRedirect: '/' }),
  (req, res) => res.redirect('/')
);

app.get('/auth/logout', (req, res) => {
  req.logout(() => res.redirect('/'));
});

app.get('/api/me', async (req, res) => {
  if (!req.isAuthenticated()) return res.json({ loggedIn: false });
  let user = { steamId: req.user.steamId, name: req.user.name, avatar: req.user.avatar };
  if (STEAM_API_KEY) {
    try {
      const r = await fetch(
        `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${req.user.steamId}`
      );
      const data = await r.json();
      const p = data?.response?.players?.[0];
      if (p) {
        user.name = p.personaname || user.name;
        user.avatar = p.avatarfull || p.avatarmedium || p.avatar || user.avatar;
      }
    } catch (e) {}
  }
  res.json({ loggedIn: true, user });
});

app.get('/api/stats', async (req, res) => {
  const steamId = req.query.steamid;
  if (!steamId) return res.json({ success: false, reason: 'no_steamid' });
  if (!STEAM_API_KEY) return res.json({ success: false, reason: 'no_steam_key' });
  try {
    const r = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?appid=730&key=${STEAM_API_KEY}&steamid=${steamId}`
    );
    const data = await r.json();
    if (data.playerstats) return res.json({ success: true, data: data.playerstats });
    if (data.response?.error) return res.json({ success: false, reason: 'steam_error' });
    return res.json({ success: false, reason: 'no_stats' });
  } catch (e) {
    return res.json({ success: false, reason: 'network' });
  }
});

app.get('/api/player', async (req, res) => {
  const steamId = req.query.steamid;
  if (!steamId || !STEAM_API_KEY) {
    return res.json(null);
  }
  try {
    const [sumRes, gamesRes] = await Promise.all([
      fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`),
      fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&appids_filter[0]=730&include_played_free_games=1`)
    ]);
    const sumData = await sumRes.json();
    const gamesData = await gamesRes.json();
    const player = sumData?.response?.players?.[0] || null;
    const csGame = gamesData?.response?.games?.[0];
    if (player && csGame?.playtime_forever) {
      player.game_hours = Math.round(csGame.playtime_forever / 60);
    }
    res.json(player);
  } catch (e) {
    res.json(null);
  }
});

async function findFaceitPlayer(steamId, nickname) {
  if (!steamId && !nickname) return null;
  if (steamId && FACEIT_API_KEY) {
    for (const gameId of ['cs2', 'csgo']) {
      const r = await fetch(
        `https://open.faceit.com/data/v4/players?game=${gameId}&game_player_id=${steamId}`,
        { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
      );
      const p = await r.json();
      if (p?.player_id && !p.error) return { player: p, gameId };
    }
  }
  if (nickname && FACEIT_API_KEY) {
    const r = await fetch(
      `https://open.faceit.com/data/v4/search/players?nickname=${encodeURIComponent(nickname)}&limit=5`,
      { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
    );
    const data = await r.json();
    const items = data?.items || [];
    for (const item of items) {
      if (item.nickname?.toLowerCase() === nickname.toLowerCase()) {
        const pr = await fetch(`https://open.faceit.com/data/v4/players/${item.player_id}`,
          { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } });
        const full = await pr.json();
        if (full?.player_id) return { player: full, gameId: full.games?.cs2 ? 'cs2' : 'csgo' };
      }
    }
    if (items[0]?.player_id) {
      const pr = await fetch(`https://open.faceit.com/data/v4/players/${items[0].player_id}`,
        { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } });
      const full = await pr.json();
      if (full?.player_id) return { player: full, gameId: full.games?.cs2 ? 'cs2' : 'csgo' };
    }
  }
  return null;
}

async function fetchFaceitGameStats(playerId, gameId) {
  if (!playerId || !gameId || !FACEIT_API_KEY) return null;
  const r = await fetch(
    `https://open.faceit.com/data/v4/players/${playerId}/stats/${gameId}`,
    { headers: { Authorization: `Bearer ${FACEIT_API_KEY}` } }
  );
  const data = await r.json();
  return data?.lifetime || data;
}

app.get('/api/faceit/stats', async (req, res) => {
  const steamId = req.query.steamid;
  const nickname = req.query.nickname;
  const all = req.query.all === '1';
  if (!steamId && !nickname) return res.json({ success: false });
  if (!FACEIT_API_KEY) return res.json({ success: false });
  try {
    const found = await findFaceitPlayer(steamId, nickname);
    if (!found?.player) return res.json({ success: false });
    const player = found.player;
    const games = player.games || {};
    if (all) {
      const [cs2Stats, csgoStats] = await Promise.all([
        games.cs2 ? fetchFaceitGameStats(player.player_id, 'cs2') : Promise.resolve(null),
        games.csgo ? fetchFaceitGameStats(player.player_id, 'csgo') : Promise.resolve(null)
      ]);
      return res.json({
        success: true,
        player: { nickname: player.nickname, avatar: player.avatar },
        cs2: games.cs2 ? { game: games.cs2, stats: cs2Stats } : null,
        csgo: games.csgo ? { game: games.csgo, stats: csgoStats } : null
      });
    }
    const gameId = found.gameId;
    const stats = await fetchFaceitGameStats(player.player_id, gameId);
    const game = player.games?.cs2 || player.games?.csgo || {};
    return res.json({ success: true, player: { nickname: player.nickname, avatar: player.avatar, ...game }, stats });
  } catch (e) {
    return res.json({ success: false });
  }
});

const HLTV_API = 'https://hltv-api.vercel.app/api';
const BALLDONTLIE_API = 'https://api.balldontlie.io';
const CUTOFF_2026 = new Date('2026-01-01').getTime();
const CUTOFF_2020 = new Date('2020-01-01').getTime();

async function fetchHltvEvents() {
  const [matchesRes, resultsRes] = await Promise.all([
    fetch(`${HLTV_API}/matches.json`),
    fetch(`${HLTV_API}/results.json`)
  ]);
  const matches = await matchesRes.json().catch(() => []);
  const results = await resultsRes.json().catch(() => []);

  const eventsMap = new Map();
  const addMatch = (m) => {
    const name = m.event?.name;
    if (!name) return;
    const time = m.time ? new Date(m.time).getTime() : 0;
    if (!time) return;
    if (!eventsMap.has(name)) {
      eventsMap.set(name, { name, logo: m.event?.logo || '', startDate: time, endDate: time, matchCount: 0 });
    }
    const e = eventsMap.get(name);
    e.startDate = Math.min(e.startDate, time);
    e.endDate = Math.max(e.endDate, time);
    e.matchCount++;
  };
  matches.forEach(addMatch);
  results.forEach(addMatch);

  return Array.from(eventsMap.values())
    .filter((e) => e.startDate >= CUTOFF_2020)
    .map((e) => ({ name: e.name, logo: e.logo, startDate: e.startDate, endDate: e.endDate, matchCount: e.matchCount }))
    .sort((a, b) => a.startDate - b.startDate)
    .slice(0, 50);
}

async function fetchBalldontlieEvents() {
  if (!BALLDONTLIE_API_KEY) return null;
  const all = [];
  let cursor = null;
  for (let i = 0; i < 5; i++) {
    const url = new URL(`${BALLDONTLIE_API}/cs/v1/tournaments`);
    url.searchParams.set('per_page', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const r = await fetch(url.toString(), {
      headers: { Authorization: BALLDONTLIE_API_KEY }
    });
    if (!r.ok) return null;
    const data = await r.json().catch(() => null);
    if (!data?.data?.length) break;
    all.push(...data.data);
    cursor = data.meta?.next_cursor ?? data.meta?.next_page;
    if (!cursor) break;
  }
  const now = Date.now();
  const cutoff = now - 180 * 24 * 60 * 60 * 1000;
  return all
    .filter((t) => {
      const start = t.start_date ? new Date(t.start_date).getTime() : 0;
      const end = t.end_date ? new Date(t.end_date).getTime() : start;
      return end >= cutoff && start > 0;
    })
    .map((t) => ({
      name: t.name,
      logo: '',
      startDate: t.start_date ? new Date(t.start_date).getTime() : 0,
      endDate: t.end_date ? new Date(t.end_date).getTime() : 0,
      matchCount: 0,
      tier: t.tier,
      prizePool: t.prize_pool,
      location: t.location || t.country
    }))
    .sort((a, b) => a.startDate - b.startDate)
    .slice(0, 100);
}

app.get('/api/calendar/events', async (req, res) => {
  try {
    let events = await fetchBalldontlieEvents();
    if (!events?.length) events = await fetchHltvEvents();
    res.json({ success: true, events: events || [], source: events?.length ? 'balldontlie' : 'hltv' });
  } catch (e) {
    try {
      const events = await fetchHltvEvents();
      res.json({ success: true, events, source: 'hltv' });
    } catch (e2) {
      res.json({ success: false, events: [] });
    }
  }
});

app.get('/api/hltv/events', async (req, res) => {
  try {
    const events = await fetchHltvEvents();
    res.json({ success: true, events });
  } catch (e) {
    res.json({ success: false, events: [] });
  }
});

app.listen(PORT, () => {
  console.log(`Sakura CS2: http://localhost:${PORT}`);
  if (!STEAM_API_KEY) console.warn('⚠️  STEAM_API_KEY не задан!');
  if (!FACEIT_API_KEY) console.warn('⚠️  FACEIT_API_KEY не задан — Faceit fallback недоступен.');
  if (!BALLDONTLIE_API_KEY) console.warn('⚠️  BALLDONTLIE_API_KEY не задан — календарь использует HLTV.');
});
