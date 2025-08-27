// Butterfly Animation System
const ButterflyAnimation = {
  colors: ['blue', 'purple', 'pink', 'yellow', 'orange', 'green', 'sparkle', 'flower'],

  _audio: null,
  _ensureAudio() {
    if (!this._audio) {
      try {
        this._audio = new Audio('sounds/bling.mp3');
        this._audio.preload = 'auto';
        this._audio.volume = 0.6;
      } catch(e) {
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
        if (p && typeof p.catch === 'function') { p.catch(()=>{}); }
      }
    } catch(e) {
      console.warn('Audio play failed', e);
    }
  },
  
  createButterfly(delay = 0, startY = 0) {
    const butterfly = document.createElement('div');
    butterfly.className = `butterfly ${this.colors[Math.floor(Math.random() * this.colors.length)]}`;
    
    // More centered distribution
    const x = Math.random() * 70 + 15; // 15-85% (more centered range)
    const size = 12 + Math.random() * 20; // 12-32px 
    const duration = 3.5 + Math.random() * 2.5; // 3.5-6s (longer flight time)
    const drift = (Math.random() - 0.5) * 80; // -40px to +40px (tighter drift for centering)
    const rotation = (Math.random() - 0.5) * 30; // -15deg to +15deg
    const flutter = 3 + Math.random() * 7; // 3-10deg
    
    butterfly.style.setProperty('--x', `${x}%`);
    butterfly.style.setProperty('--size', `${size}px`);
    butterfly.style.setProperty('--duration', `${duration}s`);
    butterfly.style.setProperty('--delay', `${delay}s`);
    butterfly.style.setProperty('--start-y', `${startY}%`);
    butterfly.style.setProperty('--drift', `${drift}px`);
    butterfly.style.setProperty('--rotation', `${rotation}deg`);
    butterfly.style.setProperty('--flutter', `${flutter}deg`);
    
    return butterfly;
  },
  
  
  runAnimationOn(loadingOverlay) {
    // Generate butterflies
    const container = loadingOverlay.querySelector('#butterflyContainer');
    if (container) {
      // Moderate count for performance
      this.generateButterflySwarm(container, 120);
    }
    // Try sound
    this.playSfx();
    // Start curtains
    setTimeout(() => {
      loadingOverlay.classList.add('opening');
    }, 1500);
    // Hide & remove
    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
      setTimeout(() => {
        if (loadingOverlay && loadingOverlay.parentNode) {
          loadingOverlay.remove();
        }
      }, 1200);
    }, 4500);
  },
runCompleteAnimation() {
    console.log('Running complete butterfly animation sequence');
    
    // Always create a fresh overlay for consistent behavior
    const loadingOverlay = this.createLoadingOverlay();
    document.body.appendChild(loadingOverlay);
    console.log('Created fresh overlay');
    
    // Generate butterflies immediately
    const container = loadingOverlay.querySelector('#butterflyContainer');
    if (container) {
      this.generateButterflySwarm(container, 120);
      this.playSfx();
      console.log('Generated 1050 butterflies');
    } else {
      console.error('Butterfly container not found!');
      return;
    }
    
    // Start curtain opening after 4 seconds (same for all cases)
    setTimeout(() => {
      loadingOverlay.classList.add('opening');
      console.log('Opening curtains');
    }, 4500);
    
    // Remove overlay after complete animation (same for all cases)
    setTimeout(() => {
      loadingOverlay.classList.add('hidden');
      setTimeout(() => {
        if (loadingOverlay.parentNode) {
          loadingOverlay.remove();
        }
        console.log('Animation complete, overlay removed');
      }, 1500);
    }, 6500);
  },
  
  generateButterflySwarm(container, count = 1050) {
    console.log(`Generating ${count} butterflies in container:`, container); // Debug log
    
    // Clear existing butterflies
    container.innerHTML = '';
    
    // Create more waves for better distribution with massive count
    const waves = 15;
    const butterfliesPerWave = Math.floor(count / waves);
    
    for (let wave = 0; wave < waves; wave++) {
      for (let i = 0; i < butterfliesPerWave; i++) {
        const delay = (wave * 0.15) + (i * 0.008); // Faster waves, tighter timing
        const startY = Math.random() * 15 - 5; // Start from -5% to 10% (some start below screen)
        const butterfly = this.createButterfly(delay, startY);
        container.appendChild(butterfly);
      }
    }
    
    console.log(`Created ${container.children.length} butterflies`); // Debug log
    
    // Clean up butterflies after animation (longer duration for higher flight)
    setTimeout(() => {
      if (container.parentNode) {
        container.innerHTML = '';
      }
    }, 15000); // Increased to 15 seconds for full flight completion
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

// Loading Animation - Initial Load
(function() {
  const loadingOverlay = document.getElementById('loading-curtains');
  if (loadingOverlay) {
    // Rerun the animation on the existing overlay
    ButterflyAnimation.runAnimationOn(loadingOverlay);
  }
})();

// Retrigger Animation Button
document.addEventListener('DOMContentLoaded', () => {
  const retriggerBtn = document.getElementById('retriggerAnimation');
  if (retriggerBtn) {
    retriggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Retrigger button clicked!'); // Debug log
      
      // Add click feedback
      retriggerBtn.style.transform = 'scale(0.9)';
      setTimeout(() => {
        retriggerBtn.style.transform = '';
      }, 150);
      
      // Use the same animation function
      ButterflyAnimation.runCompleteAnimation();
    });
  } else {
    console.log('Retrigger button not found!'); // Debug log
  }
});

// Also add event listener after page loads as backup
window.addEventListener('load', () => {
  const retriggerBtn = document.getElementById('retriggerAnimation');
  if (retriggerBtn && !retriggerBtn.hasAttribute('data-listener-added')) {
    retriggerBtn.setAttribute('data-listener-added', 'true');
    retriggerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Backup retrigger clicked!'); // Debug log
      
      // Add click feedback
      retriggerBtn.style.transform = 'scale(0.9)';
      setTimeout(() => {
        retriggerBtn.style.transform = '';
      }, 150);
      
      // Use the same animation function
      ButterflyAnimation.runCompleteAnimation();
    });
  }
});

// Test function for debugging (can be called from browser console)
window.testButterflies = function() {
  console.log('Testing butterfly animation...');
  ButterflyAnimation.runCompleteAnimation();
};

// Make ButterflyAnimation available globally for debugging
window.ButterflyAnimation = ButterflyAnimation;

// Light/dark toggle + niceties
(function(){
  const root = document.documentElement;
  const saved = localStorage.getItem('theme');
  
  // Apply saved theme or default to dark
  if (saved === 'light') {
    root.classList.add('light');
  }
  
  // Theme toggle with enhanced feedback
  document.getElementById('themeToggle').addEventListener('click', () => {
    const isLight = root.classList.contains('light');
    const themeToggle = document.getElementById('themeToggle');
    
    // Add click animation
    themeToggle.style.transform = 'scale(0.9)';
    setTimeout(() => {
      themeToggle.style.transform = '';
    }, 150);
    
    // Toggle theme
    root.classList.toggle('light');
    const newTheme = root.classList.contains('light') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    
    // Update aria-label for accessibility
    themeToggle.setAttribute('aria-label', 
      `Switch to ${newTheme === 'light' ? 'dark' : 'light'} theme`
    );
  });
  
  // Smooth scrolling for navigation links
  document.querySelectorAll('.nav-link, .brand').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetSection = document.querySelector(targetId);
      
      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
  
  // Active navigation highlighting on scroll
  const sections = document.querySelectorAll('section[id], main[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  
  const observerOptions = {
    rootMargin: '-20% 0px -60% 0px',
    threshold: 0
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Remove active class from all nav links
        navLinks.forEach(link => link.classList.remove('active'));
        
        // Add active class to corresponding nav link
        const activeLink = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    });
  }, observerOptions);
  
  // Observe all sections
  sections.forEach(section => observer.observe(section));
  
  // Copy email functionality
  document.getElementById('copyEmail').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText('jennifer.saunders@phoenix.edu');
      const btn = document.getElementById('copyEmail');
      const old = btn.textContent;
      btn.textContent = 'Copied ✓';
      btn.style.background = 'var(--tertiary)';
      btn.style.color = 'white';
      setTimeout(() => {
        btn.textContent = old;
        btn.style.background = '';
        btn.style.color = '';
      }, 1200);
    } catch(e){
      // Fallback for browsers that don't support clipboard API
      console.log('Email: jennifer.saunders@phoenix.edu');
    }
  });
  
  // Set current year
  document.getElementById('year').textContent = new Date().getFullYear();
  
  // Initialize theme toggle aria-label
  const themeToggle = document.getElementById('themeToggle');
  const currentTheme = root.classList.contains('light') ? 'light' : 'dark';
  themeToggle.setAttribute('aria-label', 
    `Switch to ${currentTheme === 'light' ? 'dark' : 'light'} theme`
  );
  
  // Enhanced Skills Matrix Interactivity
  const skillItems = document.querySelectorAll('.skill-item');
  const superpowerItems = document.querySelectorAll('.superpower-item');
  
  // Add tooltips and enhanced interactions for skill items
  skillItems.forEach(skill => {
    skill.addEventListener('mouseenter', () => {
      const level = skill.getAttribute('data-level');
      const levelText = {
        expert: '⭐⭐⭐ Expert Level',
        advanced: '⭐⭐ Advanced',
        intermediate: '⭐ Intermediate'
      };
      
      // Create temporary tooltip
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
      if (tooltip) {
        tooltip.remove();
      }
    });
  });
  
  // Add enhanced animations for superpowers
  superpowerItems.forEach(item => {
    item.addEventListener('mouseenter', () => {
      const icon = item.querySelector('.superpower-icon');
      icon.style.transform = 'scale(1.2) rotate(5deg)';
      icon.style.transition = 'transform 0.3s ease';
    });
    
    item.addEventListener('mouseleave', () => {
      const icon = item.querySelector('.superpower-icon');
      icon.style.transform = 'scale(1) rotate(0deg)';
    });
  });
  
  // Project hover functionality
  const projectCards = document.querySelectorAll('.project-card');
  const projectDetails = document.getElementById('projectDetails');
  const projectImg = document.getElementById('projectImg');
  const projectText = document.getElementById('projectText');
  
  // Project data mapping
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
        <p>Rebuilt automation to route students to the right AC teams, improving accuracy and cycle time</p>
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
        <p>Created and launched EET CoFit app</p>
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
        <p>Led a hack initiative that automated the licensure checks for program changes (now in production)</p>
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
          <li>Learned the ins and outs of the P&P (Policies and Procedures site)</li>
          <li>Mapped out SOP of AC team surrounding alternative credits</li>
          <li>Researched API and other data locations for all necessary information</li>
        </ul>
      `
    },
    'ProgramChangeAutomationHack': {
      image: 'photos/ProgramChangeAutomationHack.jpg',
      description: `
        <p>Led hack initiative to automate legacy Program Change process, saving hours of SSA and FA manual work</p>
        <ul>
          <li>Coordinated with SSA and FA teams to understand entrenched manual processes</li>
          <li>Utilized both "Shapers" and "Makers" to complete comprehensive automation solution</li>
          <li>Combined app development with Flowable automation for end-to-end process improvement</li>
          <li>Tackled legacy system "no one wants to touch" - demonstrating innovation courage</li>
          <li>Currently in talks to move project forward to production implementation</li>
          <li>Full presentation available: <a href="https://apolloedu-my.sharepoint.com/:p:/g/personal/jennifer_saunders_phoenix_edu/EfCysfotz0ZApuNUEdV1-KgBaQ10C-3bAI1f4Gl88wQmtw?e=t0fRet" target="_blank" rel="noopener">Program Change Automation Hack</a></li>
        </ul>
      `
    },
    'BlackboardLTIAwardsApp': {
      image: 'photos/BlackBoardLTIAwardsApp.jpg',
      description: `
        <p>Prize-winning hack project creating Blackboard LTI integration for student awards system</p>
        <ul>
          <li>Won prizes for both Architect and Technical Lead vote recognition</li>
          <li>Created Blackboard Learn EC2 instance as development playground</li>
          <li>Collaborated with Codex team (Keenan, Carles, Ro) and Data Knights (Ankit)</li>
          <li>Built React app to seamlessly integrate with Blackboard LTI framework</li>
          <li>Worked with Ryan Graham to master Blackboard integration complexities</li>
          <li>Demonstrated cross-platform educational technology expertise</li>
          <li>Project details: <a href="https://uopx.atlassian.net/browse/HACK-384" target="_blank" rel="noopener">HACK-384</a></li>
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
          <li>Designed flexible query format enabling Data Knights team autonomy</li>
          <li>Collaborated with Travis Parma on Dev/Prod authentication strategies</li>
          <li>Coordinated with Harshil and Sanjay to understand complex data requirements</li>
          <li>Created adaptable API requiring minimal X-Force maintenance</li>
          <li>Project stories: <a href="https://uopx.atlassian.net/browse/SET-42441" target="_blank" rel="noopener">SET-42441</a> & <a href="https://uopx.atlassian.net/browse/SET-42694" target="_blank" rel="noopener">SET-42694</a></li>
        </ul>
      `
    }
  };
  
  // Track pinned state
  let pinnedCard = null;
  
  // Add hover and click event listeners to project cards
  projectCards.forEach(card => {
    // Hover functionality (unchanged)
    card.addEventListener('mouseenter', () => {
      // Skip hover if a card is pinned
      if (pinnedCard) return;
      
      const projectKey = card.getAttribute('data-project');
      const data = projectData[projectKey];
      
      if (data) {
        // Position the details container next to the hovered card
        const cardRect = card.getBoundingClientRect();
        const containerRect = card.closest('.projects-container').getBoundingClientRect();
        
        // Calculate position relative to the projects container
        // Align bottom of details with bottom of card
        const cardHeight = cardRect.height;
        const detailsHeight = 350; // Increased estimated height to position higher
        const topPosition = (cardRect.top - containerRect.top) + cardHeight - detailsHeight;
        const leftPosition = cardRect.right - containerRect.left + 48; // 30px + 18px (quarter inch) = 48px
        
        // Set position (allow negative top to go higher)
        projectDetails.style.top = `${topPosition}px`;
        projectDetails.style.left = `${leftPosition}px`;
        
        // Set content
        projectImg.src = data.image;
        projectImg.alt = card.querySelector('h3').textContent;
        projectText.innerHTML = data.description;
        projectDetails.classList.add('show');
      }
    });
    
    card.addEventListener('mouseleave', () => {
      // Skip mouseleave if a card is pinned
      if (pinnedCard) return;
      
      projectDetails.classList.remove('show');
    });
    
    // Click functionality for pinning
    card.addEventListener('click', (e) => {
      e.preventDefault();
      
      const projectKey = card.getAttribute('data-project');
      const data = projectData[projectKey];
      
      if (pinnedCard === card) {
        // Clicking the same pinned card - unpin it
        pinnedCard = null;
        card.classList.remove('pinned');
        projectDetails.classList.remove('show');
      } else if (data) {
        // Pin this card
        if (pinnedCard) {
          pinnedCard.classList.remove('pinned'); // Remove previous pin
        }
        pinnedCard = card;
        card.classList.add('pinned');
        
        // Position the details container next to the clicked card
        const cardRect = card.getBoundingClientRect();
        const containerRect = card.closest('.projects-container').getBoundingClientRect();
        
        // Calculate position relative to the projects container
        const cardHeight = cardRect.height;
        const detailsHeight = 350;
        const topPosition = (cardRect.top - containerRect.top) + cardHeight - detailsHeight;
        const leftPosition = cardRect.right - containerRect.left + 48;
        
        // Set position
        projectDetails.style.top = `${topPosition}px`;
        projectDetails.style.left = `${leftPosition}px`;
        
        // Set content
        projectImg.src = data.image;
        projectImg.alt = card.querySelector('h3').textContent;
        projectText.innerHTML = data.description;
        projectDetails.classList.add('show');
      }
    });
  });
  
  // Also hide details when hovering over the details container and then leaving (only if not pinned)
  projectDetails.addEventListener('mouseleave', () => {
    if (!pinnedCard) {
      projectDetails.classList.remove('show');
    }
  });
})();


// --- Intro animation: ensure it runs on initial load and on retrigger ---
function initIntroAnimation(){
  try{
    const overlay = document.getElementById('loading-curtains');
    if(!overlay) return;

    // If an animation runner exists, use it; else fallback to simple fade-out
    const run = (window.ButterflyAnimation && (ButterflyAnimation.runAnimationOn || ButterflyflyAnimation.runCompleteAnimation || ButterflyAnimation.run)) || null;
    const playSound = () => {
      try{
        const audio = new Audio('./sounds/bling.mp3');
        audio.volume = 0.7;
        audio.play().catch(()=>{});
      }catch(e){}
    };

    if(run){
      // Prefer runAnimationOn(existingOverlay)
      if (ButterflyAnimation.runAnimationOn) {
        playSound();
        ButterflyAnimation.runAnimationOn(overlay);
      } else if (ButterflyAnimation.runCompleteAnimation) {
        playSound();
        ButterflyAnimation.runCompleteAnimation();
      } else {
        playSound();
        ButterflyAnimation.run();
      }
    }else{
      // Fallback: show then fade out overlay
      overlay.style.opacity = '1';
      setTimeout(()=>{
        overlay.style.transition = 'opacity 800ms ease';
        overlay.style.opacity = '0';
        setTimeout(()=> overlay.style.display = 'none', 850);
      }, 600);
    }
  }catch(e){ console.warn('Intro animation init error', e); }
}

// Run on window load so images/fonts are ready
window.addEventListener('load', initIntroAnimation);
