const express = require('express');
const session = require('express-session');
const passport = require('passport');
const SteamStrategy = require('passport-steam').Strategy;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Steam API ключ — получи на https://steamcommunity.com/dev/apikey
const STEAM_API_KEY = process.env.STEAM_API_KEY || '';

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
  cookie: { secure: process.env.NODE_ENV === 'production' }
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

app.listen(PORT, () => {
  console.log(`Sakura CS2: http://localhost:${PORT}`);
  if (!STEAM_API_KEY) {
    console.warn('⚠️  STEAM_API_KEY не задан! Получи ключ: https://steamcommunity.com/dev/apikey');
  }
});
