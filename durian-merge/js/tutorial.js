// Tutorial Manager — 4-step tutorial overlay with swipe/button navigation
const TutorialManager = (() => {
  const STORAGE_KEY = 'durianMergeTutorialDone';
  let currentStep = 0;
  let touchStartX = 0;
  let els = {};

  const steps = [
    {
      icon: '👇',
      title: 'Drop Fruits',
      desc: 'Tap or drag to choose where to drop your fruit. It falls straight down!',
      illustration: 'drop',
    },
    {
      icon: '🔄',
      title: 'Merge Same Fruits',
      desc: 'When two identical fruits touch, they merge into a bigger fruit!',
      illustration: 'merge',
    },
    {
      icon: '⚠️',
      title: 'Watch the Line',
      desc: 'If fruits stack above the danger line, it\'s game over. Keep them low!',
      illustration: 'line',
    },
    {
      icon: '🏆',
      title: 'Score Big!',
      desc: 'Bigger merges = more points. Chain combos for bonus scores!',
      illustration: 'score',
    },
  ];

  function isDone() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function markDone() {
    localStorage.setItem(STORAGE_KEY, 'true');
  }

  function init() {
    els = {
      overlay: document.getElementById('tutorialOverlay'),
      slides: document.getElementById('tutorialSlides'),
      dots: document.getElementById('tutorialDots'),
      prevBtn: document.getElementById('tutorialPrev'),
      nextBtn: document.getElementById('tutorialNext'),
      skipBtn: document.getElementById('tutorialSkip'),
      dontShow: document.getElementById('tutorialDontShow'),
    };
  }

  function show() {
    if (!els.overlay) init();
    currentStep = 0;
    renderSlides();
    renderDots();
    updateNav();
    els.overlay.style.display = '';
    els.overlay.classList.add('active');

    // Bind events
    els.prevBtn.addEventListener('click', prev);
    els.nextBtn.addEventListener('click', next);
    els.skipBtn.addEventListener('click', close);
    els.overlay.addEventListener('touchstart', onTouchStart, { passive: true });
    els.overlay.addEventListener('touchend', onTouchEnd, { passive: true });
  }

  function close() {
    if (els.dontShow && els.dontShow.checked) {
      markDone();
    }
    els.overlay.classList.remove('active');
    els.overlay.style.display = 'none';

    // Unbind
    els.prevBtn.removeEventListener('click', prev);
    els.nextBtn.removeEventListener('click', next);
    els.skipBtn.removeEventListener('click', close);
    els.overlay.removeEventListener('touchstart', onTouchStart);
    els.overlay.removeEventListener('touchend', onTouchEnd);
  }

  function renderSlides() {
    let html = '';
    steps.forEach((step, i) => {
      html += `
        <div class="tut-slide ${i === 0 ? 'active' : ''}" data-step="${i}">
          <div class="tut-illust tut-illust-${step.illustration}">
            <span class="tut-icon">${step.icon}</span>
          </div>
          <h2 class="tut-title">${step.title}</h2>
          <p class="tut-desc">${step.desc}</p>
        </div>`;
    });
    els.slides.innerHTML = html;
  }

  function renderDots() {
    let html = '';
    steps.forEach((_, i) => {
      html += `<span class="tut-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></span>`;
    });
    els.dots.innerHTML = html;
  }

  function goTo(idx) {
    if (idx < 0 || idx >= steps.length) return;
    currentStep = idx;

    // Update slides
    els.slides.querySelectorAll('.tut-slide').forEach((slide, i) => {
      slide.classList.toggle('active', i === idx);
    });

    // Update dots
    els.dots.querySelectorAll('.tut-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === idx);
    });

    updateNav();
  }

  function prev() { goTo(currentStep - 1); }
  function next() {
    if (currentStep >= steps.length - 1) {
      close();
    } else {
      goTo(currentStep + 1);
    }
  }

  function updateNav() {
    els.prevBtn.style.visibility = currentStep === 0 ? 'hidden' : 'visible';
    if (currentStep >= steps.length - 1) {
      els.nextBtn.textContent = 'Got it!';
    } else {
      els.nextBtn.textContent = 'Next';
    }
  }

  // Swipe support
  function onTouchStart(e) {
    touchStartX = e.changedTouches[0].clientX;
  }

  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
  }

  return {
    isDone,
    show,
    close,
    init,
  };
})();
