(function () {
  const API_BASE =
    (typeof window !== 'undefined' && window.API_BASE) ||
    (window.location.hostname.includes('github.io') ? 'https://statistics-gm7c.onrender.com' : '');

  const MONTHS_RU = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
  const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth();
  let events = [];

  function getMonthData(year, month) {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = (first.getDay() + 6) % 7;
    const daysInMonth = last.getDate();
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const prevLast = new Date(prevYear, prevMonth + 1, 0).getDate();
    const cells = [];
    let day = 1;
    let prevDay = prevLast - startDay + 1;
    for (let i = 0; i < 42; i++) {
      if (i < startDay) {
        cells.push({ day: prevDay++, isPrev: true, isNext: false });
      } else if (day <= daysInMonth) {
        cells.push({ day: day++, isPrev: false, isNext: false });
      } else {
        cells.push({ day: i - startDay - daysInMonth + 1, isPrev: false, isNext: true });
      }
    }
    return { cells, daysInMonth, startDay };
  }

  function getEventsForDate(year, month, day) {
    const dayStart = new Date(year, month, day).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
    return events.filter((e) => e.startDate <= dayEnd && e.endDate >= dayStart);
  }

  function renderMiniCalendar(containerId, year, month) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const { cells } = getMonthData(year, month);
    const title = `${MONTHS_RU[month]} ${year}`;
    let html = `<div class="calendar-mini-title">${title}</div>`;
    html += '<div class="calendar-mini-days">' + DAYS_SHORT.map((d) => `<span>${d}</span>`).join('') + '</div>';
    html += '<div class="calendar-mini-grid">';
    cells.slice(0, 35).forEach((c) => {
      const cls = c.isPrev || c.isNext ? ' other-month' : '';
      html += `<span class="calendar-mini-cell${cls}">${c.day}</span>`;
    });
    html += '</div>';
    el.innerHTML = html;
  }

  function renderMainCalendar(year, month) {
    const el = document.getElementById('calendarMain');
    if (!el) return;
    const { cells, daysInMonth, startDay } = getMonthData(year, month);
    const title = `${MONTHS_RU[month].toUpperCase()} ${year}`;
    let html = `<h2 class="calendar-main-title">${title}</h2>`;
    html += '<div class="calendar-main-header">' + DAYS_FULL.map((d) => `<div class="calendar-main-day">${d}</div>`).join('') + '</div>';
    html += '<div class="calendar-main-grid">';
    cells.forEach((c, i) => {
      const cls = [];
      if (c.isPrev) cls.push('prev-month');
      if (c.isNext) cls.push('next-month');
      const evs = !c.isPrev && !c.isNext ? getEventsForDate(year, month, c.day) : [];
      if (evs.length) cls.push('has-event');
      html += `<div class="calendar-main-cell ${cls.join(' ')}" data-day="${c.day}" data-prev="${c.isPrev}" data-next="${c.isNext}">`;
      html += `<span class="cell-day">${c.day}</span>`;
      if (evs.length) {
        html += '<div class="cell-events">';
        evs.forEach((ev) => {
          const prize = ev.prizePool ? ` • $${(ev.prizePool / 1000).toFixed(0)}K` : '';
          html += `<span class="cell-event" title="${escapeHtml(ev.name)}${prize}">${escapeHtml(ev.name)}</span>`;
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    el.innerHTML = html;
  }

  function updateCalendar() {
    renderMiniCalendar('calendarPrev', currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1);
    renderMainCalendar(currentYear, currentMonth);
    renderMiniCalendar('calendarNext', currentMonth === 11 ? currentYear + 1 : currentYear, currentMonth === 11 ? 0 : currentMonth + 1);
  }

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
    const layout = document.getElementById('calendarLayout');

    try {
      loading.style.display = '';
      layout.style.display = 'none';

      const apiUrl = `${API_BASE || ''}/api/calendar/events`;
      const res = await fetch(apiUrl, { mode: 'cors' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      loading.style.display = 'none';
      layout.style.display = '';

      if (data.success && data.events?.length) {
        const now = Date.now();
        events = data.events;
        if (events.length > 0) {
          const monthStart = new Date(currentYear, currentMonth, 1).getTime();
          const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).getTime();
          const hasEventsThisMonth = events.some((e) => e.startDate <= monthEnd && e.endDate >= monthStart);
          if (!hasEventsThisMonth) {
            const first = new Date(events[0].startDate);
            currentYear = first.getFullYear();
            currentMonth = first.getMonth();
          }
        }
      } else {
        events = [];
      }

      updateCalendar();

      if (events.length > 0) {
        let html = '<h2 class="calendar-section-title">Актуальные и будущие турниры</h2>';
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
        error.querySelector('p').textContent = 'Не удалось загрузить турниры.';
        error.style.display = '';
      }
    } catch (e) {
      loading.style.display = 'none';
      layout.style.display = '';
      events = [];
      updateCalendar();
      error.style.display = '';
    }
  }

  document.getElementById('calendarNavPrev')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    updateCalendar();
  });

  document.getElementById('calendarNavNext')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    updateCalendar();
  });

  loadEvents();
})();
