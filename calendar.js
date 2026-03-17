(function () {
  const API_BASE =
    (typeof window !== 'undefined' && window.API_BASE) ||
    (window.location.hostname.includes('github.io') ? 'https://statistics-gm7c.onrender.com' : '');

  function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function formatDateRange(start, end) {
    const s = formatDate(start);
    const e = formatDate(end);
    return s === e ? s : `${s} — ${e}`;
  }

  async function loadEvents() {
    const loading = document.getElementById('calendarLoading');
    const container = document.getElementById('calendarEvents');
    const error = document.getElementById('calendarError');

    try {
      const res = await fetch(`${API_BASE}/api/calendar/events`);
      const data = await res.json();

      loading.style.display = 'none';

      if (!data.success || !data.events?.length) {
        error.style.display = '';
        return;
      }

      const now = Date.now();
      const active = data.events.filter((e) => e.endDate >= now);

      let html = '';
      if (active.length > 0) {
        html += '<h2 class="calendar-section-title">Актуальные и будущие турниры</h2>';
        html += '<div class="calendar-grid">';
        active.forEach((ev) => {
          const isOngoing = ev.startDate < now && ev.endDate >= now;
          const extra = [];
          if (ev.tier) extra.push(`Тиер ${ev.tier}`);
          if (ev.prizePool) extra.push(`$${(ev.prizePool / 1000).toFixed(0)}K`);
          if (ev.location) extra.push(ev.location);
          html += `
          <div class="event-card ${isOngoing ? 'event-card-ongoing' : ''}">
            ${ev.logo ? `<img src="${ev.logo}" alt="" class="event-logo">` : ''}
            <div class="event-info">
              <h3 class="event-name">${escapeHtml(ev.name)}</h3>
              <p class="event-dates">${formatDateRange(ev.startDate, ev.endDate)}</p>
              ${ev.matchCount > 0 ? `<p class="event-matches">${ev.matchCount} матчей</p>` : ''}
              ${extra.length ? `<p class="event-extra">${extra.join(' • ')}</p>` : ''}
            </div>
          </div>`;
        });
        html += '</div>';
      } else {
        error.querySelector('p').textContent = 'Нет турниров с 2026 года. Данные HLTV обновляются.';
        error.style.display = '';
        return;
      }

      container.innerHTML = html;
      container.style.display = '';
    } catch (e) {
      loading.style.display = 'none';
      error.style.display = '';
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  loadEvents();
})();
