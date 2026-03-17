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
      const res = await fetch(`${API_BASE}/api/hltv/events`);
      const data = await res.json();

      loading.style.display = 'none';

      if (!data.success || !data.events?.length) {
        error.style.display = '';
        return;
      }

      const now = Date.now();
      const upcoming = data.events.filter((e) => e.startDate >= now);
      const past = data.events.filter((e) => e.endDate < now);

      let html = '';
      if (upcoming.length > 0) {
        html += '<h2 class="calendar-section-title">Ближайшие турниры</h2>';
        html += '<div class="calendar-grid">';
        upcoming.slice(0, 15).forEach((ev) => {
          html += `
          <div class="event-card">
            ${ev.logo ? `<img src="${ev.logo}" alt="" class="event-logo">` : ''}
            <div class="event-info">
              <h3 class="event-name">${escapeHtml(ev.name)}</h3>
              <p class="event-dates">${formatDateRange(ev.startDate, ev.endDate)}</p>
              <p class="event-matches">${ev.matchCount} матчей</p>
            </div>
          </div>`;
        });
        html += '</div>';
      }

      if (past.length > 0) {
        html += '<h2 class="calendar-section-title">Прошедшие турниры</h2>';
        html += '<div class="calendar-grid">';
        past.slice(0, 20).forEach((ev) => {
          html += `
          <div class="event-card event-card-past">
            ${ev.logo ? `<img src="${ev.logo}" alt="" class="event-logo">` : ''}
            <div class="event-info">
              <h3 class="event-name">${escapeHtml(ev.name)}</h3>
              <p class="event-dates">${formatDateRange(ev.startDate, ev.endDate)}</p>
              <p class="event-matches">${ev.matchCount} матчей</p>
            </div>
          </div>`;
        });
        html += '</div>';
      }

      if (!html) {
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
