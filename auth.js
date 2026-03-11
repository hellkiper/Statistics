// Проверка авторизации и обновление UI
(function() {
  const authContainer = document.getElementById('auth-container');
  if (!authContainer) return;

  function updateUI(data) {
    if (data.loggedIn && data.user) {
      authContainer.innerHTML = `
        <div class="auth-user">
          <img src="${data.user.avatar || 'https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg'}" alt="" class="auth-avatar">
          <span class="auth-name">${escapeHtml(data.user.name)}</span>
          <a href="/auth/logout" class="auth-logout">Выйти</a>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <a href="/auth/steam" class="auth-steam-btn">
          <img src="https://steamcommunity-a.akamaihd.net/public/images/signinthroughsteam/sits_01.png" alt="Steam" class="auth-steam-img">
          Войти через Steam
        </a>
      `;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  fetch('/api/me')
    .then(r => r.json())
    .then(updateUI)
    .catch(() => {
      authContainer.style.display = 'none';
    });
})();
