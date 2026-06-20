const deck = document.querySelector('#deck');
const currentSlideLabel = document.querySelector('#currentSlide');
const backButton = document.querySelector('#backButton');
const nextButton = document.querySelector('#nextButton');
const slides = [...document.querySelectorAll('.slide')];
const slideTabs = [...document.querySelectorAll('[data-slide-target]')];

let currentIndex = 0;
let hasActivated = false;

function initialSlideIndex() {
  const params = new URLSearchParams(window.location.search);
  const slideValue = Number(params.get('slide'));
  if (!Number.isInteger(slideValue)) return 0;
  return clampSlideIndex(slideValue - 1);
}

function formatSlideNumber(index) {
  return String(index + 1).padStart(2, '0');
}

function clampSlideIndex(index) {
  return Math.min(Math.max(index, 0), slides.length - 1);
}

function activateSlide(nextIndex, direction) {
  const clampedIndex = clampSlideIndex(nextIndex);
  currentIndex = clampedIndex;
  deck.dataset.direction = direction;

  slides.forEach((slide, index) => {
    slide.classList.toggle('is-active', index === clampedIndex);
    slide.setAttribute('aria-hidden', String(index !== clampedIndex));
  });

  slideTabs.forEach((tab, index) => {
    tab.classList.toggle('active', index === clampedIndex);
    tab.setAttribute('aria-selected', String(index === clampedIndex));
  });

  currentSlideLabel.textContent = formatSlideNumber(clampedIndex);
  backButton.disabled = clampedIndex === 0;
  nextButton.disabled = clampedIndex === slides.length - 1;
  updateUrl(clampedIndex);

  if (!hasActivated) {
    hasActivated = true;
    return;
  }

  const activeSlide = slides[clampedIndex];
  activeSlide.classList.remove('is-active');
  window.requestAnimationFrame(() => {
    activeSlide.classList.add('is-active');
  });
}

function goToSlide(nextIndex) {
  const clampedIndex = clampSlideIndex(nextIndex);
  if (clampedIndex === currentIndex) return;

  const direction = clampedIndex > currentIndex ? 'next' : 'back';
  activateSlide(clampedIndex, direction);
}

function updateUrl(index) {
  const url = new URL(window.location.href);
  url.searchParams.set('slide', String(index + 1));
  window.history.replaceState(null, '', url);
}

function showNextSlide() {
  goToSlide(currentIndex + 1);
}

function showPreviousSlide() {
  goToSlide(currentIndex - 1);
}

function bindNavigation() {
  nextButton.addEventListener('click', showNextSlide);
  backButton.addEventListener('click', showPreviousSlide);

  slideTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = Number(tab.dataset.slideTarget);
      goToSlide(target);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      showNextSlide();
    }

    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      showPreviousSlide();
    }
  });
}

function init() {
  bindNavigation();
  activateSlide(initialSlideIndex(), 'next');
}

init();
