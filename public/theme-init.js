(function () {
  var theme = localStorage.getItem('jsonex-theme') || 'system';
  var isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (isDark) {
    document.documentElement.classList.add('dark');
  }
})();
