// Демо-данные (замените на Steam API)
const DEMO_STATS = {
  name: 'Demo Player',
  steamId: '76561198123456789',
  avatar: 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
  kills: 12450,
  deaths: 10230,
  headshotPercent: 42,
  wins: 892,
  totalRounds: 2100,
  hoursPlayed: 1247,
};

const WEAPONS = [
  { name: 'AK-47', kills: 4521, icon: '🔫' },
  { name: 'M4A4', kills: 3120, icon: '🔫' },
  { name: 'AWP', kills: 2156, icon: '🎯' },
  { name: 'Desert Eagle', kills: 892, icon: '🔫' },
  { name: 'USP-S', kills: 654, icon: '🔫' },
  { name: 'Glock-18', kills: 521, icon: '🔫' },
  { name: 'P250', kills: 423, icon: '🔫' },
  { name: 'MP9', kills: 312, icon: '🔫' },
  { name: 'FAMAS', kills: 287, icon: '🔫' },
  { name: 'Galil AR', kills: 234, icon: '🔫' },
];

const MAPS = [
  { name: 'de_dust2', wins: 156, losses: 98, rounds: 254 },
  { name: 'de_mirage', wins: 134, losses: 102, rounds: 236 },
  { name: 'de_inferno', wins: 98, losses: 87, rounds: 185 },
  { name: 'de_nuke', wins: 67, losses: 72, rounds: 139 },
  { name: 'de_overpass', wins: 89, losses: 91, rounds: 180 },
  { name: 'de_ancient', wins: 72, losses: 78, rounds: 150 },
  { name: 'de_vertigo', wins: 54, losses: 61, rounds: 115 },
  { name: 'de_anubis', wins: 48, losses: 52, rounds: 100 },
];

const MATCHES = [
  { map: 'de_dust2', score: '16-14', kda: '24/18/5', win: true, date: '2 ч назад' },
  { map: 'de_mirage', score: '13-16', kda: '19/22/3', win: false, date: '5 ч назад' },
  { map: 'de_inferno', score: '16-11', kda: '28/15/8', win: true, date: 'Вчера' },
  { map: 'de_nuke', score: '14-16', kda: '21/20/4', win: false, date: 'Вчера' },
  { map: 'de_overpass', score: '16-9', kda: '26/12/6', win: true, date: '2 дня назад' },
];

// Извлечение Steam ID из URL или прямой ID
function parseSteamId(input) {
  if (!input || !input.trim()) return null;
  const str = input.trim();
  const steamId64 = /^7656119\d{10}$/;
  const steamUrl = /steamcommunity\.com\/(?:profiles|id)\/([\w]+)/;
  if (steamId64.test(str)) return str;
  const urlMatch = str.match(steamUrl);
  if (urlMatch) return urlMatch[1];
  return str;
}

// API ключ Steam (добавьте в .env или настройте)
const STEAM_API_KEY = ''; // Получить на https://steamcommunity.com/dev/apikey

async function fetchPlayerStats(steamId) {
  if (!STEAM_API_KEY) {
    return { success: false, demo: true };
  }
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v2/?appid=730&key=${STEAM_API_KEY}&steamid=${steamId}`
    );
    const data = await res.json();
    if (data.playerstats) return { success: true, data: data.playerstats };
    return { success: false };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
}

async function fetchPlayerSummary(steamId) {
  if (!STEAM_API_KEY) return null;
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`
    );
    const data = await res.json();
    const player = data?.response?.players?.[0];
    return player || null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

function formatStats(rawStats) {
  if (!rawStats?.stats) return DEMO_STATS;
  const stats = Object.fromEntries(rawStats.stats.map((s) => [s.name, s.value]));
  const totalKills = stats.total_kills ?? 0;
  const totalDeaths = stats.total_deaths_other ?? 0;
  const headshots = stats.total_headshot_kills ?? 0;
  const wins = stats.total_wins ?? 0;
  const rounds = stats.total_rounds_played ?? 0;
  return {
    kills: totalKills,
    deaths: totalDeaths,
    headshotPercent: totalKills > 0 ? Math.round((headshots / totalKills) * 100) : 0,
    wins,
    totalRounds: rounds,
    hoursPlayed: 0, // Steam profile separate
  };
}

function renderOverview(stats, playerInfo = null) {
  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : '0.00';
  const ids = ['statKills', 'statDeaths', 'statKD', 'statHeadshots', 'statWins', 'statHours'];
  const vals = [stats.kills, stats.deaths, kd, stats.headshotPercent + '%', stats.wins, stats.hoursPlayed || 0];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof vals[i] === 'number' ? vals[i].toLocaleString() : vals[i];
  });
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.textContent = playerInfo?.personaname || stats.name;
  const steamEl = document.getElementById('playerSteamId');
  if (steamEl) steamEl.textContent = playerInfo?.steamid || stats.steamId;
  const avatarEl = document.getElementById('playerAvatar');
  if (avatarEl && (playerInfo?.avatarfull || stats.avatar)) avatarEl.src = playerInfo?.avatarfull || stats.avatar;
}

function renderWeapons() {
  const grid = document.getElementById('weaponsGrid');
  if (!grid) return;
  grid.innerHTML = WEAPONS.map(
    (w) => `
    <div class="weapon-card">
      <div class="weapon-icon">${w.icon}</div>
      <div class="weapon-info">
        <span class="weapon-name">${w.name}</span>
        <span class="weapon-stats">${w.kills.toLocaleString()} убийств</span>
      </div>
    </div>
  `
  ).join('');
}

function renderMaps() {
  const grid = document.getElementById('mapsGrid');
  if (!grid) return;
  grid.innerHTML = MAPS.map((m) => {
    const total = m.wins + m.losses;
    const winrate = total > 0 ? Math.round((m.wins / total) * 100) : 0;
    const winrateClass = winrate >= 50 ? '' : 'low';
    return `
    <div class="map-card">
      <span class="map-name">${m.name.replace('de_', '')}</span>
      <span class="map-winrate ${winrateClass}">${winrate}%</span>
    </div>
  `;
  }).join('');
}

function renderMatches() {
  const list = document.getElementById('matchesList');
  if (!list) return;
  list.innerHTML = MATCHES.map(
    (m) => `
    <div class="match-card ${m.win ? 'win' : 'loss'}">
      <span class="match-map">${m.map.replace('de_', '')}</span>
      <span class="match-score">${m.score}</span>
      <span class="match-kda">${m.kda}</span>
      <span class="match-date">${m.date}</span>
    </div>
  `
  ).join('');
}

async function handleSearch() {
  const input = document.getElementById('steamIdInput');
  const steamId = parseSteamId(input.value);

  if (!steamId) {
    renderWithDemo();
    return;
  }

  const main = document.querySelector('main');
  main.classList.add('loading');

  const [statsRes, summary] = await Promise.all([
    fetchPlayerStats(steamId),
    fetchPlayerSummary(steamId),
  ]);

  main.classList.remove('loading');

  if (statsRes.success && statsRes.data) {
    const stats = formatStats(statsRes.data);
    stats.steamId = steamId;
    renderOverview(stats, summary);
    if (summary) {
      document.getElementById('playerAvatar').src = summary.avatarfull;
    }
  } else {
    renderWithDemo();
    if (!STEAM_API_KEY) {
      console.info('Добавьте STEAM_API_KEY в script.js для загрузки реальных данных');
    }
  }
}

function renderWithDemo() {
  renderOverview(DEMO_STATS);
  renderWeapons();
  renderMaps();
  renderMatches();
}

// Навигация по якорям
document.querySelectorAll('.nav-link').forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (href.startsWith('#')) {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach((l) => l.classList.remove('active'));
      link.classList.add('active');
      const target = document.querySelector(href);
      target?.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

const searchBtn = document.getElementById('searchBtn');
const steamInput = document.getElementById('steamIdInput');
if (searchBtn) searchBtn.addEventListener('click', handleSearch);
if (steamInput) steamInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') handleSearch();
});

// Инициализация
renderWithDemo();
