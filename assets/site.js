const header = document.querySelector('[data-header]');
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('.site-nav');
const progress = document.querySelector('.scroll-progress');

function closeMenu() {
  if (!menuToggle || !navigation) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  navigation.classList.remove('is-open');
  document.body.classList.remove('nav-open');
}

menuToggle?.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!expanded));
  navigation?.classList.toggle('is-open', !expanded);
  document.body.classList.toggle('nav-open', !expanded);
});

navigation?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));

function updateProgress() {
  const range = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = range > 0 ? window.scrollY / range : 0;
  if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

const sectionLinks = [...document.querySelectorAll('.site-nav a[href^="#"]')];
const sections = sectionLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

const navObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  sectionLinks.forEach((link) => link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`));
}, { rootMargin: '-18% 0px -68% 0px', threshold: [0, .1, .25] });
sections.forEach((section) => navObserver.observe(section));

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('is-visible');
    observer.unobserve(entry.target);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

document.querySelectorAll('.personal-notes, .life-photo, .research-themes article, .selected-paper, .service-grid article').forEach((item) => {
  item.classList.add('reveal');
  revealObserver.observe(item);
});

document.querySelectorAll('[data-life-photo]').forEach((photo) => {
  photo.addEventListener('click', () => {
    const isLit = photo.classList.toggle('is-lit');
    photo.setAttribute('aria-pressed', String(isLit));
  });
  photo.addEventListener('pointerup', () => photo.blur());
});

const searchInput = document.querySelector('#publication-search');
const filterInputs = [...document.querySelectorAll('input[data-filter]')];
const publicationList = document.querySelector('[data-publication-list]');
const publicationStatus = document.querySelector('[data-publication-status]');
const showMore = document.querySelector('[data-show-more]');

let publications = [];
const activeFilters = new Set();
let expanded = false;
const initialLimit = 14;

function escapeHTML(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function publicationCategory(publication) {
  const text = `${publication.title} ${publication.venue}`.toLowerCase();
  if (/eeg|brain|cognit|emotion|mental|medical|physiolog|gaze|auditory|ergonomic/.test(text)) return 'human';
  if (/vehicle|driv|traffic|transport|trajectory|drone|vessel|agv|navigation|mapping|logistics/.test(text)) return 'mobility';
  if (/interaction|human.machine|service|requirement|collaborat|platform|product service|human.centered/.test(text)) return 'interaction';
  return 'systems';
}

function publicationMarkup(publication) {
  const title = escapeHTML(publication.title);
  const titleMarkup = publication.href
    ? `<a href="${escapeHTML(publication.href)}" target="_blank" rel="noreferrer">${title} ↗</a>`
    : title;
  return `<li class="publication-item">
    <div class="publication-content"><h3>${titleMarkup}</h3><p>${escapeHTML(publication.authors)}</p><p>${escapeHTML(publication.venue)}</p></div>
    <span class="publication-year">${publication.year || '—'}</span>
  </li>`;
}

function renderPublications() {
  if (!publicationList || !publicationStatus || !showMore) return;
  const query = searchInput?.value.trim().toLowerCase() ?? '';
  const filtered = publications.filter((publication) => {
    const matchesFilter = activeFilters.size === 0 || activeFilters.has(publicationCategory(publication));
    const searchable = `${publication.title} ${publication.authors} ${publication.venue} ${publication.year}`.toLowerCase();
    return matchesFilter && (!query || searchable.includes(query));
  });
  const visible = expanded || query || activeFilters.size > 0 ? filtered : filtered.slice(0, initialLimit);
  publicationList.innerHTML = visible.map(publicationMarkup).join('');
  publicationStatus.textContent = `${filtered.length} publication${filtered.length === 1 ? '' : 's'}`;
  showMore.hidden = filtered.length <= initialLimit || Boolean(query) || activeFilters.size > 0;
  showMore.innerHTML = expanded ? 'Show a shorter list <span>↑</span>' : 'Show all publications <span>↓</span>';
}

searchInput?.addEventListener('input', () => {
  expanded = false;
  renderPublications();
});

filterInputs.forEach((input) => input.addEventListener('change', () => {
  if (input.checked) activeFilters.add(input.value);
  else activeFilters.delete(input.value);
  expanded = false;
  renderPublications();
}));

showMore?.addEventListener('click', () => {
  expanded = !expanded;
  renderPublications();
});

fetch('content/publications.json')
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then((items) => {
    publications = items;
    renderPublications();
  })
  .catch((error) => {
    console.error(error);
    if (publicationStatus) publicationStatus.textContent = 'The publication record could not be loaded.';
  });
