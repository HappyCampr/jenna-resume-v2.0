// Butterfly Animation System
const ButterflyAnimation = {
  colors: ['blue', 'purple', 'pink', 'yellow', 'orange', 'green', 'sparkle', 'flower'],
  SFX_PATH: 'sounds/bling.mp3',

  _audio: null,
  _ensureAudio() {
    if (!this._audio) {
      try {
        this._audio = new Audio(this.SFX_PATH);
        this._audio.preload = 'auto';
        this._audio.volume = 0.7;
      } catch (e) {
        console.warn('Audio init failed', e);
      }
    }
  },
  playSfx() {
    try {
      this._ensureAudio();
      if (this._audio) {
        this._audio.currentTime = 0;
        const p = this._audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  },

  createButterfly(delay = 0, startY = 0) {
    const el = document.createElement('div');
    el.className = `butterfly ${this.colors[Math.floor(Math.random() * this.colors.length)]}`;

    const x = Math.random() * 70 + 15;           // 15–85%
    const size = 12 + Math.random() * 20;        // 12–32px
    const duration = 3.5 + Math.random() * 2.5;  // 3.5–6s
    const drift = (Math.random() - 0.5) * 80;    // -40–40px
    const rotation = (Math.random() - 0.5) * 30; // -15–15deg
    const flutter = 3 + Math.random() * 7;       // 3–10deg

    el.style.setProperty('--x', `${x}%`);
    el.style.setProperty('--size', `${size}px`);
    el.style.setProperty('--duration', `${duration}s`);
    el.style.setProperty('--delay', `${delay}s`);
    el.style.setProperty('--start-y', `${startY}%`);
    el.style.setProperty('--drift', `${drift}px`);
    el.style.setProperty('--rotation', `${rotation}deg`);
    el.style.setProperty('--flutter', `${flutter}deg`);
    return el;
  },

  // Add the SHINE class to the logo and play sound at the exact same moment
  triggerLogoShine(loadingOverlay) {
    const logo = loadingOverlay.querySelector('.loading-logo');
    if (!logo) return;
    // restart the CSS animation if needed
    logo.classList.remove('shine');
    // force reflow so removing/adding re-triggers the animation
    void logo.offsetWidth;
    logo.classList.add('shine');
    this.playSfx();
  },

  runAnimationOn(loadingOverlay) {
    const container = loadingOverlay.querySelector('#butterflyContainer');
    if (container) this.generateButterflySwarm(container, 120);

    // Shine + sound together, just before curtains open
    setTimeout(() => {
      this.triggerLogoShine(loadingOverlay);
    }, 1200);

    // Open curtains shortly after the shine
    setTimeout(() => {
      loadingOverlay.classList.add('opening');
    }, 1500);

    // Hide & remove
    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
      setTimeout(() => loadingOverlay.parentNode && loadingOverlay.remove(), 1200);
    }, 4500);
  },

  runCompleteAnimation() {
    const loadingOverlay = this.createLoadingOverlay();
    document.body.appendChild(loadingOverlay);

    const container = loadingOverlay.querySelector('#butterflyContainer');
    if (container) this.generateButterflySwarm(container, 120);

    // Shine + sound now
    setTimeout(() => {
      this.triggerLogoShine(loadingOverlay);
    }, 1200);

    // Open after a bit
    setTimeout(() => {
      loadingOverlay.classList.add('opening');
    }, 1500);

    // Remove overlay after complete animation
    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
      setTimeout(() => loadingOverlay.parentNode && loadingOverlay.remove(), 1500);
    }, 6500);
  },

  generateButterflySwarm(container, count = 1050) {
    container.innerHTML = '';

    const waves = 15;
    const perWave = Math.floor(count / waves);

    for (let wave = 0; wave < waves; wave++) {
      for (let i = 0; i < perWave; i++) {
        const delay = (wave * 0.15) + (i * 0.008);
        const startY = Math.random() * 15 - 5;
        container.appendChild(this.createButterfly(delay, startY));
      }
    }

    setTimeout(() => {
      if (container.parentNode) container.innerHTML = '';
    }, 15000);
  },

  createLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'loading-curtains';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="curtain curtain-left">
        <div class="curtain-pattern"></div>
      </div>
      <div class="curtain curtain-right">
        <div class="curtain-pattern"></div>
      </div>
      <div class="loading-content">
        <div class="loading-logo">JS</div>
        <div class="loading-text">Welcome to Jenna's Portfolio</div>
        <div class="loading-butterflies" id="butterflyContainer"></div>
      </div>
    `;
    return overlay;
  }
};

// Expose for debugging
window.ButterflyAnimation = ButterflyAnimation;

// --- Initial Load: ensure overlay exists and run the animation
function initIntroAnimation() {
  try {
    let overlay = document.getElementById('loading-curtains');
    if (!overlay) {
      overlay = ButterflyAnimation.createLoadingOverlay();
      document.body.appendChild(overlay);
    }
    if (ButterflyAnimation.runAnimationOn) {
      ButterflyAnimation.runAnimationOn(overlay);
    } else if (ButterflyAnimation.runCompleteAnimation) {
      ButterflyAnimation.runCompleteAnimation();
    }
  } catch (e) {
    console.warn('Intro animation init error', e);
    // Fallback fade
    const overlay = document.getElementById('loading-curtains');
    if (overlay) {
      overlay.style.opacity = '1';
      setTimeout(() => {
        overlay.style.transition = 'opacity 800ms ease';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.style.display = 'none', 850);
      }, 600);
    }
  }
}

// Optional: prime audio after first user gesture to avoid autoplay blocks
document.addEventListener('pointerdown', function once() {
  ButterflyAnimation._ensureAudio();
  if (ButterflyAnimation._audio) {
    ButterflyAnimation._audio.play()
      .then(() => {
        ButterflyAnimation._audio.pause();
        ButterflyAnimation._audio.currentTime = 0;
      })
      .catch(() => {});
  }
  document.removeEventListener('pointerdown', once);
}, { once: true });

// Run on window load so images/fonts are ready
window.addEventListener('load', initIntroAnimation);

// Retrigger Animation Button
document.addEventListener('DOMContentLoaded', () => {
  const retriggerBtn = document.getElementById('retriggerAnimation');
  if (!retriggerBtn) return;

  const clickHandler = (e) => {
    e.preventDefault();
    retriggerBtn.style.transform = 'scale(0.9)';
    setTimeout(() => (retriggerBtn.style.transform = ''), 150);
    ButterflyAnimation.runCompleteAnimation();
  };

  retriggerBtn.addEventListener('click', clickHandler);
  // backup for late-bound elements
  window.addEventListener('load', () => {
    if (!retriggerBtn.hasAttribute('data-listener-added')) {
      retriggerBtn.setAttribute('data-listener-added', 'true');
      retriggerBtn.addEventListener('click', clickHandler);
    }
  });
});
