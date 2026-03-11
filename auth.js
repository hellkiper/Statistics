// Проверка авторизации и обновление UI
(function() {
  const authContainer = document.getElementById('auth-container');
  if (!authContainer) return;

  const API_BASE = (typeof window !== 'undefined' && window.API_BASE) ||
    (window.location.hostname.includes('github.io') ? 'https://statistics-gm7c.onrender.com' : '');
  const base = (path) => (path.startsWith('http') ? path : `${API_BASE}${path}`);

  function updateUI(data) {
    if (data.loggedIn && data.user) {
      authContainer.innerHTML = `
        <div class="auth-user-block">
          <img src="${data.user.avatar || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'}" alt="" class="auth-avatar">
          <span class="auth-name">${escapeHtml(data.user.name)}</span>
          <a href="${base('/auth/logout')}" class="auth-logout">Выйти</a>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <div class="auth-btns">
          <a href="${base('/auth/steam')}" class="btn-hero btn-auth-reg">Регистрация</a>
          <a href="${base('/auth/steam')}" class="auth-steam-btn" title="Войти через Steam">
            <img src="https://store.steampowered.com/favicon.ico" alt="Steam" class="auth-steam-logo">
          </a>
        </div>
      `;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  fetch(base('/api/me'), { credentials: 'include' })
    .then(r => r.json())
    .then(updateUI)
    .catch(() => {
      authContainer.innerHTML = `
        <div class="auth-btns">
          <a href="${base('/auth/steam')}" class="btn-hero btn-auth-reg">Регистрация</a>
          <a href="${base('/auth/steam')}" class="auth-steam-btn" title="Войти через Steam">
            <img src="https://store.steampowered.com/favicon.ico" alt="Steam" class="auth-steam-logo">
          </a>
        </div>
      `;
    });
})();
