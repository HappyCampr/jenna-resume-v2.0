// ==============================
// Butterfly Animation System
// ==============================
const ButterflyAnimation = {
  colors: ['blue', 'purple', 'pink', 'yellow', 'orange', 'green', 'sparkle', 'flower'],
  SFX_PATH: 'sounds/bling.mp3',

  _audio: null,
  _audioReady: false,
  _pendingShinePlay: false,

  _ensureAudio() {
    if (!this._audio) {
      try {
        this._audio = new Audio(this.SFX_PATH);
        this._audio.preload = 'auto';
        this._audio.volume = 0.75;
      } catch (e) {
        console.warn('Audio init failed', e);
      }
    }
  },

  // Attempt to play; if autoplay is blocked, mark as pending until user gesture.
  playSfx() {
    this._ensureAudio();
    if (!this._audio) return;

    try {
      this._audio.currentTime = 0;
      const p = this._audio.play();
      if (p && typeof p.then === 'function') {
        p.then(() => { this._audioReady = true; })
         .catch(() => { this._pendingShinePlay = true; });
      }
    } catch (e) {
      console.warn('Audio play failed', e);
      this._pendingShinePlay = true;
    }
  },

  // One-time unlock handler for stricter autoplay policies
  installAutoplayUnlock() {
    const unlock = () => {
      this._ensureAudio();
      if (this._audio && this._pendingShinePlay) {
        this._audio.currentTime = 0;
        this._audio.play().catch(() => {});
        this._pendingShinePlay = false;
        this._audioReady = true;
      }
      window.removeEventListener('pointerdown', unlock, { capture: true });
      window.removeEventListener('keydown', unlock, { capture: true });
    };
    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
    window.addEventListener('keydown', unlock, { capture: true, once: true });
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

  // Shine the logo and (attempt to) play the sound at the exact same moment
  triggerLogoShine(overlay) {
    const logo = overlay.querySelector('.loading-logo');
    if (!logo) return;
    logo.classList.remove('shine');
    void logo.offsetWidth; // reflow to retrigger CSS animation
    logo.classList.add('shine');
    this.playSfx();
  },

  // === TIMING (initial + retrigger) ===
  // Butterflies are generated immediately so they are visible as curtains open.
  runAnimationOn(overlay) {
    const container = overlay.querySelector('#butterflyContainer');

    // 1) Generate butterflies immediately with tiny stagger
    if (container) this.generateButterflySwarm(container, 160, /*baseDelay=*/0.0);

    // 2) Shine + sound a bit before curtains start
    setTimeout(() => this.triggerLogoShine(overlay), 450);

    // 3) Curtains open while butterflies are already in motion
    setTimeout(() => {
      overlay.classList.add('opening');
    }, 650);

    // 4) Hide & remove overlay after animation completes
    setTimeout(() => {
      overlay.classList.add('hidden');
      setTimeout(() => overlay.parentNode && overlay.remove(), 1200);
    }, 4600);
  },

  runCompleteAnimation() {
    const overlay = this.createLoadingOverlay();
    document.body.appendChild(overlay);
    // Same timing as initial load; butterflies start early here too
    this.runAnimationOn(overlay);
  },

  // Faster-start swarm: more waves + minimal per-butterfly delay
  generateButterflySwarm(container, count = 1050, baseDelay = 0.0) {
    container.innerHTML = '';

    const waves = 12;
    const perWave = Math.floor(count / waves);

    for (let w = 0; w < waves; w++) {
      for (let i = 0; i < perWave; i++) {
        const delay = baseDelay + (w * 0.06) + (i * 0.003);
        const startY = Math.random() * 10 - 3; // -3% to 7%
        container.appendChild(this.createButterfly(delay, startY));
      }
    }

    // Clean up after flight
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

// Make available globally for debugging
window.ButterflyAnimation = ButterflyAnimation;

// ==============================
// Intro animation wiring
// ==============================

function initIntroAnimation() {
  try {
    // Prepare autoplay unlock ASAP
    ButterflyAnimation.installAutoplayUnlock();

    let overlay = document.getElementById('loading-curtains');
    if (!overlay) {
      overlay = ButterflyAnimation.createLoadingOverlay();
      document.body.appendChild(overlay);
    }

    ButterflyAnimation.runAnimationOn(overlay);
  } catch (e) {
    console.warn('Intro animation init error', e);
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

// Run on window load so fonts/images are ready
window.addEventListener('load', initIntroAnimation);

// ==============================
// Retrigger Animation Button (kept as-is, but butterflies start earlier via runAnimationOn)
// ==============================
document.addEventListener('DOMContentLoaded', () => {
  const retriggerBtn = document.getElementById('retriggerAnimation');
  if (retriggerBtn) {
    retriggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Click feedback
      retriggerBtn.style.transform = 'scale(0.9)';
      setTimeout(() => {
        retriggerBtn.style.transform = '';
      }, 150);
      // Use the same animation function (butterflies already tuned to start early)
      ButterflyAnimation.runCompleteAnimation();
    });
  } else {
    console.log('Retrigger button not found!');
  }
});

// Backup listener after full load (kept identical)
window.addEventListener('load', () => {
  const retriggerBtn = document.getElementById('retriggerAnimation');
  if (retriggerBtn && !retriggerBtn.hasAttribute('data-listener-added')) {
    retriggerBtn.setAttribute('data-listener-added', 'true');
    retriggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      retriggerBtn.style.transform = 'scale(0.9)';
      setTimeout(() => {
        retriggerBtn.style.transform = '';
      }, 150);
      ButterflyAnimation.runCompleteAnimation();
    });
  }
});

// Test from console if needed
window.testButterflies = function() {
  ButterflyAnimation.runCompleteAnimation();
};

// ==============================
// Light/dark toggle + niceties (unchanged site features)
// ==============================
(function(){
  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  
  // Apply saved theme or default to dark
  if (saved === 'light') {
    root.classList.add('light');
  }

  // Theme toggle with enhanced feedback
  const themeToggleEl = document.getElementById('themeToggle');
  if (themeToggleEl) {
    themeToggleEl.addEventListener('click', () => {
      const isLight = root.classList.contains('light');

      // Click animation
      themeToggleEl.style.transform = 'scale(0.9)';
      setTimeout(() => { themeToggleEl.style.transform = ''; }, 150);

      // Toggle theme
      root.classList.toggle('light');
      const newTheme = root.classList.contains('light') ? 'light' : 'dark';
      localStorage.setItem('theme', newTheme);

      // Update aria-label
      themeToggleEl.setAttribute('aria-label', `Switch to ${newTheme === 'light' ? 'dark' : 'light'} theme`);
    });
  }
  
  // Smooth scrolling for navigation links
  document.querySelectorAll('.nav-link, .brand').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
  
  // Active navigation highlighting on scroll
  const sections = document.querySelectorAll('section[id], main[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  const observerOptions = { rootMargin: '-20% 0px -60% 0px', threshold: 0 };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => link.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (activeLink) activeLink.classList.add('active');
      }
    });
  }, observerOptions);
  sections.forEach(section => observer.observe(section));
  
  // Copy email functionality
  const copyBtn = document.getElementById('copyEmail');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText('jennifer.saunders@phoenix.edu');
        const old = copyBtn.textContent;
        copyBtn.textContent = 'Copied ✓';
        copyBtn.style.background = 'var(--tertiary)';
        copyBtn.style.color = 'white';
        setTimeout(() => {
          copyBtn.textContent = old;
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 1200);
      } catch(e){
        console.log('Email: jennifer.saunders@phoenix.edu');
      }
    });
  }
  
  // Set current year
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  
  // Initialize theme toggle aria-label
  if (themeToggleEl) {
    const currentTheme = root.classList.contains('light') ? 'light' : 'dark';
    themeToggleEl.setAttribute('aria-label', `Switch to ${currentTheme === 'light' ? 'dark' : 'light'} theme`);
  }
  
  // Enhanced Skills Matrix Interactivity
  const skillItems = document.querySelectorAll('.skill-item');
  const superpowerItems = document.querySelectorAll('.superpower-item');
  
  // Tooltips for skill items
  skillItems.forEach(skill => {
    skill.addEventListener('mouseenter', () => {
      const level = skill.getAttribute('data-level');
      const levelText = {
        expert: '⭐⭐⭐ Expert Level',
        advanced: '⭐⭐ Advanced',
        intermediate: '⭐ Intermediate'
      };
      const tooltip = document.createElement('div');
      tooltip.className = 'skill-tooltip';
      tooltip.textContent = levelText[level];
      tooltip.style.cssText = `
        position: absolute;
        background: var(--accent);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 1000;
        pointer-events: none;
        transform: translateY(-100%);
        margin-top: -8px;
      `;
      skill.style.position = 'relative';
      skill.appendChild(tooltip);
    });
    skill.addEventListener('mouseleave', () => {
      const tooltip = skill.querySelector('.skill-tooltip');
      if (tooltip) tooltip.remove();
    });
  });
  
  // Superpower icon hover animations
  superpowerItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      const icon = item.querySelector('.superpower-icon');
      if (icon) {
        icon.style.transform = 'scale(1.2) rotate(5deg)';
        icon.style.transition = 'transform 0.3s ease';
      }
    });
    item.addEventListener('mouseleave', () => {
      const icon = item.querySelector('.superpower-icon');
      if (icon) icon.style.transform = 'scale(1) rotate(0deg)';
    });
  });
  
  // Project hover functionality
  const projectCards = document.querySelectorAll('.project-card');
  const projectDetails = document.getElementById('projectDetails');
  const projectImg = document.getElementById('projectImg');
  const projectText = document.getElementById('projectText');
  
  const projectData = {
    'IPAddressLookUpSystem': {
      image: 'photos/IPAddressLookUpSystem.jpg',
      description: `
        <p>Drove process to provide the Suspicious Activity team with an IP address lookup system for students and prospects</p>
        <ul>
          <li>Finished AI Similarity Project and identified need for better IP address data</li>
          <li>Researched counts and costs for pulling IP address data</li>
          <li>Worked with tech lead for discovery on unique IP address lookup</li>
          <li>Researched new source for IP address data</li>
          <li>Coordinated with sourcing, legal and stakeholders to procure provider with lower costs and better data quality</li>
          <li>Reduced cost of previous provider by half, while exceeding expectations for data amount and quality</li>
        </ul>
      `
    },
    'TeamAssignmentAutomation': {
      image: 'photos/TeamAssignmentAutomation.jpg',
      description: `
        <p>Rebuilt automation to route students to the right counseling teams, improving accuracy and cycle time</p>
        <ul>
          <li>Earned Automation Anywhere certification</li>
          <li>Streamlined a three-bot process into one bot</li>
          <li>Added functionality to reduce labor from operations teams, including a team assignment system that accounted for team load leveling</li>
          <li>Process is attached to SharePoint folders for easy updates by operations team</li>
          <li>Simplified process for ad hoc loads and team leveling</li>
        </ul>
      `
    },
    'EETCoFitApp': {
      image: 'photos/EETCoFitApp.jpg',
      description: `
        <p>Created and launched employee engagement team CoFit app</p>
        <ul>
          <li>Worked with cross-functional team members to design and implement the app</li>
          <li>Conducted discovery on how to launch a Python app in AWS using current best practices</li>
          <li>Multi-page and multi-function app that tracked and updated user fitness goal data</li>
          <li>Created DynamoDB tables to store user data</li>
        </ul>
      `
    },
    'AddressChangeLicensureAutomation': {
      image: 'photos/AddressChangeLicensureAutomation.jpg',
      description: `
        <p>Led a proof of concept that automated the licensure checks for program changes (now in production)</p>
        <ul>
          <li>Curated buy-in from multiple business teams</li>
          <li>Demonstrated Flowable automation and how it can improve processes</li>
          <li>Automated above and beyond initial expectations</li>
        </ul>
      `
    },
    'WFForecastinginPowerBI': {
      image: 'photos/WFForecastinginPowerBI.jpg',
      description: `
        <p>Built forecasting dashboards to speed forecasting for withdrawals and failures</p>
        <ul>
          <li>Recreated manual Excel calculations inside Power BI</li>
          <li>Created adaptable reporting that allowed users to customize numbers and estimates</li>
          <li>Worked closely with stakeholders to provide report that can be rebuilt with any metric for forecasting</li>
        </ul>
      `
    },
    'AlternativeCreditUIDiscovery': {
      image: 'photos/AlternativeCreditUIDiscovery.jpg',
      description: `
        <p>Completed original discovery work to improve student experience around alternative credit</p>
        <ul>
          <li>Learned the ins and outs of legacy website</li>
          <li>Mapped out SOP of AC team surrounding alternative credits</li>
          <li>Researched API and other data locations for all necessary information</li>
        </ul>
      `
    },
    'ProgramChangeAutomationHack': {
      image: 'photos/ProgramChangeAutomationHack.jpg',
      description: `
        <p>Led proof of concept to automate legacy Program Change process, saving hours of SSA and FA manual work</p>
        <ul>
          <li>Coordinated with SSA and FA teams to understand entrenched manual processes</li>
          <li>Utilized both "Shapers" and "Makers" to complete comprehensive automation solution</li>
          <li>Combined app development with Flowable automation for end-to-end process improvement</li>
          <li>Tackled legacy system "no one wants to touch" - demonstrating innovation courage</li>
          <li>Currently in talks to move project forward to production implementation</li>
        </ul>
      `
    },
    'BlackboardLTIAwardsApp': {
      image: 'photos/BlackBoardLTIAwardsApp.jpg',
      description: `
        <p>Prize-winning project creating Blackboard LTI integration for student awards system</p>
        <ul>
          <li>Won prizes for both Architect and Technical Lead vote recognition</li>
          <li>Created Blackboard Learn EC2 instance as development playground</li>
          <li>Collaborated with multiple IT and data team members</li>
          <li>Built React app to seamlessly integrate with Blackboard LTI framework</li>
          <li>Worked with technologist to master Blackboard integration complexities</li>
        </ul>
      `
    },
    'SalesforceAPIAltCredit': {
      image: 'photos/SalesforceAPIAltCredit.jpg',
      description: `
        <p>Architected elegant Salesforce API solution for Alternative Credit application data access</p>
        <ul>
          <li>Completed Salesforce Trailhead training and API structure mastery</li>
          <li>Built zero-Apex code solution preserving organizational API limits</li>
          <li>Designed flexible query format enabling data team autonomy</li>
          <li>Collaborated with technologist on Dev/Prod authentication strategies</li>
          <li>Coordinated with stakeholders to understand complex data requirements</li>
          <li>Created adaptable API requiring minimal team maintenance</li>
        </ul>
      `
    }
  };
  
  let pinnedCard = null;

  projectCards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      if (pinnedCard) return;
      const key = card.getAttribute('data-project');
      const data = projectData[key];
      if (data && projectDetails) {
        const cardRect = card.getBoundingClientRect();
        const containerRect = card.closest('.projects-container').getBoundingClientRect();
        const cardHeight = cardRect.height;
        const detailsHeight = 350;
        const topPosition = (cardRect.top - containerRect.top) + cardHeight - detailsHeight;
        const leftPosition = cardRect.right - containerRect.left + 48;
        projectDetails.style.top = `${topPosition}px`;
        projectDetails.style.left = `${leftPosition}px`;
        projectImg.src = data.image;
        projectImg.alt = card.querySelector('h3').textContent;
        projectText.innerHTML = data.description;
        projectDetails.classList.add('show');
      }
    });

    card.addEventListener('mouseleave', () => {
      if (!pinnedCard && projectDetails) projectDetails.classList.remove('show');
    });

    card.addEventListener('click', (e) => {
      e.preventDefault();
      const key = card.getAttribute('data-project');
      const data = projectData[key];
      if (pinnedCard === card) {
        pinnedCard = null;
        card.classList.remove('pinned');
        if (projectDetails) projectDetails.classList.remove('show');
      } else if (data) {
        if (pinnedCard) pinnedCard.classList.remove('pinned');
        pinnedCard = card;
        card.classList.add('pinned');

        const cardRect = card.getBoundingClientRect();
        const containerRect = card.closest('.projects-container').getBoundingClientRect();
        const cardHeight = cardRect.height;
        const detailsHeight = 350;
        const topPosition = (cardRect.top - containerRect.top) + cardHeight - detailsHeight;
        const leftPosition = cardRect.right - containerRect.left + 48;
        projectDetails.style.top = `${topPosition}px`;
        projectDetails.style.left = `${leftPosition}px`;
        projectImg.src = data.image;
        projectImg.alt = card.querySelector('h3').textContent;
        projectText.innerHTML = data.description;
        projectDetails.classList.add('show');
      }
    });
  });

  if (projectDetails) {
    projectDetails.addEventListener('mouseleave', () => {
      if (!pinnedCard) projectDetails.classList.remove('show');
    });
  }
})();
