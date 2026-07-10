document.addEventListener('DOMContentLoaded', function () {
  var hamburger = document.querySelector('.nav-hamburger');
  var links = document.querySelector('.nav-links');
  var backdrop = document.querySelector('.nav-backdrop');
  if (!hamburger || !links) return;

  function closeNav() {
    links.classList.remove('open');
    hamburger.classList.remove('active');
    hamburger.setAttribute('aria-expanded', 'false');
    if (backdrop) backdrop.classList.remove('open');
    document.body.classList.remove('nav-open');
  }

  function openNav() {
    links.classList.add('open');
    hamburger.classList.add('active');
    hamburger.setAttribute('aria-expanded', 'true');
    if (backdrop) backdrop.classList.add('open');
    document.body.classList.add('nav-open');
  }

  hamburger.addEventListener('click', function () {
    if (links.classList.contains('open')) {
      closeNav();
    } else {
      openNav();
    }
  });

  if (backdrop) backdrop.addEventListener('click', closeNav);

  links.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeNav);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });
});
