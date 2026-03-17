(function () {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE) || (window.location.hostname.includes('github.io') ? 'https://statistics-gm7c.onrender.com' : '');

  function formatDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatDateRange(start, end) {
    const s = formatDate(start);
    const e = formatDate(end);
    return s === e ? s : `${s} — ${e}`;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  async function loadEvents() {
    const loading = document.getElementById('calendarLoading');
    const container = document.getElementById('calendarEvents');
    const error = document.getElementById('calendarError');

    try {
      loading.style.display = '';
      container.style.display = 'none';
      error.style.display = 'none';

      const apiUrl = `${API_BASE || ''}/api/calendar/events`;
      const res = await fetch(apiUrl, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      loading.style.display = 'none';

      if (data.success && data.events?.length) {
        const now = Date.now();
        const events = data.events;

        let html = '<h2 class="calendar-section-title">Турниры CS2</h2>';
        html += '<div class="calendar-grid">';
        events.forEach((ev) => {
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
        container.innerHTML = html;
        container.style.display = '';
      } else {
        error.querySelector('p').textContent = 'Нет турниров.';
        error.style.display = '';
      }
    } catch (e) {
      loading.style.display = 'none';
      error.style.display = '';
    }
  }

  loadEvents();
})();
