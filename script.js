const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-button');
const nav = document.querySelector('.nav-links');
const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const sections = [...document.querySelectorAll('main section[id]')];

function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '메뉴 열기');
  nav.classList.remove('open');
  document.body.classList.remove('menu-open');
}

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
  menuButton.setAttribute('aria-expanded', String(!isOpen));
  menuButton.setAttribute('aria-label', isOpen ? '메뉴 열기' : '메뉴 닫기');
  nav.classList.toggle('open', !isOpen);
  document.body.classList.toggle('menu-open', !isOpen);
});

navLinks.forEach((link) => link.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 680) closeMenu(); });
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && nav.classList.contains('open')) {
    closeMenu();
    menuButton.focus();
  }
});

function updateNavigation() {
  header.classList.toggle('scrolled', window.scrollY > 24);
  const marker = window.scrollY + window.innerHeight * 0.35;
  let current = '';

  sections.forEach((section) => {
    if (marker >= section.offsetTop) current = section.id;
  });

  navLinks.forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
  });
}

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px' });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));
document.getElementById('year').textContent = new Date().getFullYear();
window.addEventListener('scroll', updateNavigation, { passive: true });
updateNavigation();
