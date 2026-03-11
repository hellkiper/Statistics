// Подсветка активной страницы в навигации
document.addEventListener('DOMContentLoaded', function() {
  const path = window.location.pathname;
  const currentFile = path.split('/').pop() || 'index.html';
  const currentPage = currentFile.replace(/\.html$/, '') || 'index';

  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    const linkPage = (href.replace(/\.html$/, '').split('/').pop() || '').toLowerCase();
    const page = currentPage.toLowerCase();
    link.classList.toggle('active', linkPage === page);
  });
});
