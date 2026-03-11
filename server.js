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

app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      loggedIn: true,
      user: {
        steamId: req.user.steamId,
        name: req.user.name,
        avatar: req.user.avatar
      }
    });
  } else {
    res.json({ loggedIn: false });
  }
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

app.listen(PORT, () => {
  console.log(`Sakura CS2: http://localhost:${PORT}`);
  if (!STEAM_API_KEY) console.warn('⚠️  STEAM_API_KEY не задан!');
  if (!FACEIT_API_KEY) console.warn('⚠️  FACEIT_API_KEY не задан — Faceit fallback недоступен.');
});
