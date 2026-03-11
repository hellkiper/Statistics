const EMPTY_STATS = {
  kills: 0,
  deaths: 0,
  headshotPercent: 0,
  wins: 0,
  totalRounds: 0,
  matches: 0,
  assists: 0,
  mvp: 0,
  hoursPlayed: 0,
  weapons: [],
  maps: []
};

const WEAPON_NAMES = {
  ak47: 'AK-47',
  m4a1: 'M4A1',
  m4a1_silencer: 'M4A1-S',
  awp: 'AWP',
  deagle: 'Desert Eagle',
  usp_silencer: 'USP-S',
  glock: 'Glock-18',
  p250: 'P250',
  mp9: 'MP9',
  famas: 'FAMAS',
  galilar: 'Galil AR',
  elite: 'Dual Berettas',
  fiveseven: 'Five-SeveN',
  tec9: 'Tec-9',
  mac10: 'MAC-10',
  mp7: 'MP7',
  ump45: 'UMP-45',
  p90: 'P90',
  ppbizon: 'PP-Bizon',
  nova: 'Nova',
  xm1014: 'XM1014',
  mag7: 'MAG-7',
  sawedoff: 'Sawed-Off',
  negev: 'Negev',
  m249: 'M249',
  ssg08: 'SSG 08',
  scar20: 'SCAR-20',
  g3sg1: 'G3SG1',
  hkp2000: 'P2000',
  revolver: 'R8 Revolver'
};

const API_BASE = (typeof window !== 'undefined' && window.API_BASE) ||
  (window.location.hostname.includes('github.io') ? 'https://statistics-gm7c.onrender.com' : '');

async function apiFetch(url, opts = {}) {
  const full = url.startsWith('http') ? url : `${API_BASE}${url}`;
  const fetchOpts = { ...opts, credentials: 'include' };
  let res = await fetch(full, fetchOpts);
  if (res.status === 502 || res.status === 503) {
    await new Promise((r) => setTimeout(r, 6000));
    res = await fetch(full, fetchOpts);
  }
  return res;
}

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

async function fetchPlayerStats(steamId) {
  try {
    const res = await apiFetch(`/api/stats?steamid=${encodeURIComponent(steamId)}`);
    const data = await res.json();
    if (data.success) return { success: true, data: data.data };
    return { success: false, reason: data.reason };
  } catch (err) {
    console.error('fetchPlayerStats', err);
    return { success: false, reason: 'network' };
  }
}

async function fetchFaceitStatsAll(steamId, nickname) {
  try {
    const params = new URLSearchParams({ all: '1' });
    if (steamId) params.set('steamid', steamId);
    if (nickname) params.set('nickname', nickname);
    const res = await apiFetch(`/api/faceit/stats?${params}`);
    const data = await res.json();
    if (data.success) return { success: true, player: data.player, cs2: data.cs2, csgo: data.csgo };
    return { success: false };
  } catch (err) {
    console.error('fetchFaceitStatsAll', err);
    return { success: false };
  }
}

const num = (v) => (typeof v === 'string' ? parseFloat(String(v).replace('%', '').replace(',', '.')) : v) || 0;

function formatFaceitStatsFromRaw(lt, gameInfo) {
  const matches = num(lt['Matches']) || 1;
  const avgK = num(lt['Average Kills']) || num(lt['Kills']);
  const avgD = num(lt['Average Deaths']) || num(lt['Deaths']);
  const kills = avgK > 0 ? Math.round(avgK * matches) : num(lt['Total Kills']) || 0;
  const deaths = avgD > 0 ? Math.round(avgD * matches) : num(lt['Total Deaths']) || 0;
  const wins = num(lt['Wins']) || 0;
  const headshotPct = num(lt['Headshots %']) || num(lt['Average Headshots %']) || 0;
  const assists = num(lt['Total Assists']) || Math.round((num(lt['Average Assists']) || 0) * matches);
  const mvp = num(lt['MVPs']) || Math.round((num(lt['Average MVPs']) || 0) * matches);
  return {
    matches,
    kills,
    deaths,
    headshotPercent: Math.round(headshotPct),
    wins,
    totalRounds: matches * 24,
    hoursPlayed: 0,
    assists,
    mvp,
    skillLabel: gameInfo?.skill_level_label,
    faceitElo: gameInfo?.faceit_elo
  };
}

async function fetchPlayerSummary(steamId) {
  try {
    const res = await apiFetch(`/api/player?steamid=${encodeURIComponent(steamId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('fetchPlayerSummary', err);
    return null;
  }
}

function formatStats(rawStats, playerInfo = null) {
  if (!rawStats?.stats) return { ...EMPTY_STATS };
  const s = Object.fromEntries(rawStats.stats.map((x) => [x.name, x.value]));
  const totalKills = s.total_kills ?? 0;
  const totalDeaths = s.total_deaths_other ?? 0;
  const headshots = s.total_headshot_kills ?? 0;
  const wins = s.total_wins ?? 0;
  const rounds = s.total_rounds_played ?? 0;
  const assists = s.total_kills_assist ?? s.total_kills_assists ?? 0;
  const mvp = s.total_mvps ?? s.total_mvp ?? 0;

  const weapons = [];
  for (const [key, val] of Object.entries(s)) {
    const m = key.match(/^total_kills_(.+)$/);
    if (m && val > 0) {
      const id = m[1].toLowerCase();
      weapons.push({ name: WEAPON_NAMES[id] || id.toUpperCase(), kills: val });
    }
  }
  weapons.sort((a, b) => b.kills - a.kills);

  const maps = [];
  for (const [key, val] of Object.entries(s)) {
    const m = key.match(/^total_wins_map_(.+)$/);
    if (m && val > 0) {
      const mapId = m[1];
      const roundsKey = `total_rounds_map_${mapId}`;
      const mapRounds = s[roundsKey] ?? val * 2;
      const losses = Math.max(0, mapRounds - val);
      maps.push({ name: mapId.replace('de_', ''), wins: val, losses, rounds: mapRounds });
    }
  }
  maps.sort((a, b) => b.wins - a.wins);

  const matches = Math.ceil(rounds / 24) || 0;

  return {
    kills: totalKills,
    deaths: totalDeaths,
    headshotPercent: totalKills > 0 ? Math.round((headshots / totalKills) * 100) : 0,
    wins,
    totalRounds: rounds,
    matches,
    assists,
    mvp,
    hoursPlayed: playerInfo?.game_hours ?? 0,
    weapons: weapons.slice(0, 12),
    maps: maps.slice(0, 10)
  };
}

function renderOverview(stats, playerInfo = null) {
  const m = stats.matches ?? Math.ceil((stats.totalRounds || 0) / 24) || 0;
  const kd = stats.deaths > 0 ? (stats.kills / stats.deaths).toFixed(2) : '0.00';
  const winrate = m > 0 ? Math.round((stats.wins / m) * 100) : 0;
  const ids = ['statMatches', 'statKills', 'statDeaths', 'statKD', 'statHeadshots', 'statWins', 'statWinrate', 'statAssists', 'statMVP', 'statHours'];
  const vals = [m, stats.kills, stats.deaths, kd, (stats.headshotPercent || 0) + '%', stats.wins, winrate + '%', stats.assists || 0, stats.mvp || 0, stats.hoursPlayed || 0];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof vals[i] === 'number' ? vals[i].toLocaleString() : vals[i];
  });
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.textContent = playerInfo?.personaname || playerInfo?.nickname || stats.name || 'Игрок';
  const steamEl = document.getElementById('playerSteamId');
  const labelEl = document.getElementById('playerIdLabel');
  if (steamEl) steamEl.textContent = stats.faceitElo ? stats.faceitElo : (playerInfo?.steamid || stats.steamId || '—');
  if (labelEl) labelEl.textContent = stats.faceitElo ? 'Faceit ELO:' : 'Steam ID:';
  const rankEl = document.getElementById('playerRank');
  if (rankEl) rankEl.textContent = stats.skillLabel || '—';
  const avatarEl = document.getElementById('playerAvatar');
  if (avatarEl && (playerInfo?.avatarfull || playerInfo?.avatar || stats.avatar)) {
    avatarEl.src = playerInfo?.avatarfull || playerInfo?.avatar || stats.avatar;
  }
}

function renderWeapons(weaponsData = null) {
  const grid = document.getElementById('weaponsGrid');
  if (!grid) return;
  const list = weaponsData?.length > 0 ? weaponsData.map((w) => ({ ...w, icon: '🔫' })) : [];
  grid.innerHTML = list
    .map(
      (w) => `
    <div class="weapon-card">
      <div class="weapon-icon">${w.icon || '🔫'}</div>
      <div class="weapon-info">
        <span class="weapon-name">${w.name}</span>
        <span class="weapon-stats">${(w.kills || 0).toLocaleString()} убийств</span>
      </div>
    </div>
  `
    )
    .join('');
}

function renderMaps(mapsData = null) {
  const grid = document.getElementById('mapsGrid');
  if (!grid) return;
  const list = mapsData?.length > 0 ? mapsData : [];
  grid.innerHTML = list
    .map((m) => {
      const total = (m.wins || 0) + (m.losses || 0);
      const winrate = total > 0 ? Math.round(((m.wins || 0) / total) * 100) : 0;
      const winrateClass = winrate >= 50 ? '' : 'low';
      return `
    <div class="map-card">
      <span class="map-name">${(m.name || '').replace('de_', '')}</span>
      <span class="map-winrate ${winrateClass}">${winrate}%</span>
    </div>
  `;
    })
    .join('');
}

function renderMatches(matchesData = null) {
  const list = document.getElementById('matchesList');
  if (!list) return;
  const items = matchesData?.length > 0 ? matchesData : [];
  list.innerHTML = items
    .map(
      (m) => `
    <div class="match-card ${m.win ? 'win' : 'loss'}">
      <span class="match-map">${(m.map || '').replace('de_', '')}</span>
      <span class="match-score">${m.score || '—'}</span>
      ${m.kda ? `<span class="match-kda">${m.kda}</span>` : ''}
      <span class="match-date">${m.date || '—'}</span>
    </div>
  `
    )
    .join('');
}

async function handleSearch(sessionUser = null) {
  const input = document.getElementById('steamIdInput');
  let steamId = parseSteamId(input?.value) || sessionUser?.steamId;
  const faceitNick = document.getElementById('faceitNickInput')?.value?.trim();

  if (!sessionUser && !steamId && !faceitNick) {
    renderEmpty();
    return;
  }

  if (!sessionUser) {
    try {
      const r = await apiFetch('/api/me');
      const d = await r.json();
      if (d.loggedIn && d.user) sessionUser = d.user;
    } catch (e) {}
  }
  if (sessionUser?.steamId && !steamId) {
    steamId = sessionUser.steamId;
    if (input) input.value = steamId;
  }
  if (!steamId && !faceitNick) {
    renderEmpty();
    return;
  }

  const main = document.querySelector('main');
  if (main) main.classList.add('loading');
  document.getElementById('apiErrorHint')?.style.setProperty('display', 'none');

  let stats = null;
  let playerInfo = null;
  let weapons = [];
  let maps = [];
  let lastErrorReason = null;

  const fallbackFromSession = sessionUser ? {
    personaname: sessionUser.name,
    avatarfull: sessionUser.avatar,
    avatar: sessionUser.avatar,
    steamid: sessionUser.steamId || steamId
  } : null;

  if (steamId) {
    const [statsRes, summary] = await Promise.all([
      fetchPlayerStats(steamId),
      fetchPlayerSummary(steamId),
    ]);
    lastErrorReason = statsRes?.reason;
    playerInfo = summary || fallbackFromSession || { personaname: 'Игрок', steamid: steamId };
    if (statsRes.success && statsRes.data) {
      stats = formatStats(statsRes.data, summary);
      stats.steamId = steamId;
      weapons = stats.weapons || [];
      maps = stats.maps || [];
    } else if (summary || fallbackFromSession) {
      const p = summary || fallbackFromSession;
      stats = { ...EMPTY_STATS, steamId, hoursPlayed: p?.game_hours || 0 };
    }
  }

  const tryFaceit = (!stats?.kills && !stats?.deaths && !stats?.matches) && (steamId || faceitNick);
  if (tryFaceit) {
    const faceitRes = await fetchFaceitStatsAll(steamId || undefined, faceitNick || undefined);
    if (faceitRes.success) {
      if (!playerInfo) playerInfo = { nickname: faceitRes.player?.nickname, avatar: faceitRes.player?.avatar };
      else {
        if (faceitRes.player?.avatar) playerInfo.avatar = faceitRes.player.avatar;
        if (faceitRes.player?.nickname) playerInfo.nickname = faceitRes.player.nickname;
      }
      const faceitStats = faceitRes.cs2 || faceitRes.csgo;
      if (faceitStats) {
        stats = formatFaceitStatsFromRaw(faceitStats.stats || {}, faceitStats.game);
        stats.steamId = steamId;
      }
    }
  }

  if (main) main.classList.remove('loading');

  if (stats && (stats.kills > 0 || stats.deaths > 0 || stats.matches > 0)) {
    renderOverview(stats, playerInfo);
    renderWeapons(weapons);
    renderMaps(maps);
    const list = document.getElementById('matchesList');
    if (list) renderMatches([]);
  } else {
    const apiHint = document.getElementById('apiErrorHint');
    if (apiHint) {
      let msg = 'Steam не отдаёт статистику для CS2. ';
      if (lastErrorReason === 'no_steam_key') msg = 'STEAM_API_KEY не задан на Render. ';
      else if (lastErrorReason === 'network') msg = 'Сервер не отвечает (подожди 30 сек). ';
      msg += 'Открой Steam → Конфиденциальность → Публичный. Либо введи Faceit ник и нажми Поиск.';
      apiHint.textContent = msg;
      apiHint.style.display = '';
    }
    document.getElementById('faceitSearchWrap')?.style.setProperty('display', '');
    if (!stats) stats = { ...EMPTY_STATS, steamId };
    renderOverview(stats, playerInfo || fallbackFromSession);
    renderWeapons([]);
    renderMaps([]);
    const list = document.getElementById('matchesList');
    if (list) renderMatches([]);
  }
}

function renderEmpty() {
  document.getElementById('apiErrorHint')?.style.setProperty('display', 'none');
  document.getElementById('faceitSearchWrap')?.style.setProperty('display', 'none');
  renderOverview({ ...EMPTY_STATS });
  const rankEl = document.getElementById('playerRank');
  if (rankEl) rankEl.textContent = '—';
  const labelEl = document.getElementById('playerIdLabel');
  if (labelEl) labelEl.textContent = 'Steam ID:';
  renderWeapons([]);
  renderMaps([]);
  const list = document.getElementById('matchesList');
  if (list) renderMatches([]);
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
async function initStats() {
  const input = document.getElementById('steamIdInput');
  if (!input) return;
  try {
    const res = await apiFetch('/api/me');
    const data = await res.json();
    if (data.loggedIn && data.user?.steamId) {
      input.value = data.user.steamId;
      await handleSearch(data.user);
      return;
    }
  } catch (e) {}
  renderEmpty();
}
initStats();
