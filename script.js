// ==========================================================================
// PRATEEK TYAGI — Cinematic Portfolio & CV Controller
// Canvas Frame Engine, 3-Slide Auto Hero Carousel, Dual Theme & Working Contact
// ==========================================================================

(() => {
  'use strict';

  // ------------------------------------------------------------------------
  // Frame Animation Engine Configuration
  // ------------------------------------------------------------------------
  const TOTAL_FRAMES = 120;
  const FRAME_DIR = 'frames_30fps';
  const FRAME_PREFIX = 'frame_';
  const FRAME_EXT = '.png';

  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const loaderBar = document.getElementById('loader-bar');
  const siteHeader = document.getElementById('site-header');
  const canvasContainer = document.getElementById('canvas-container');

  // Theme Toggle Elements
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');

  // Hero Carousel Elements
  const heroStage = document.getElementById('hero');
  const slides = document.querySelectorAll('.hero-slide');
  const slideButtons = document.querySelectorAll('.slide-num');
  const indicatorLine = document.getElementById('indicator-line');
  const scrollHint = document.getElementById('scroll-hint');
  const resumeDownloadBtn = document.getElementById('resume-download-btn');

  const images = new Array(TOTAL_FRAMES);
  const loadedFlags = new Array(TOTAL_FRAMES).fill(false);
  let loadedCount = 0;

  // Scroll & Animation States
  let currentProgress = 0;
  let targetProgress = 0;
  let lastRenderedFrame = -1;
  let currentActiveSlide = 0;
  let needsRedraw = true;
  let autoSlideTimer = null;
  let isHoveringHero = false;

  // Keep Visuals ALWAYS ON (user explicitly requested "keep visulas always on")
  const isBgVisible = true;
  if (canvasContainer) {
    canvasContainer.classList.add('bg-visible');
    canvasContainer.classList.remove('bg-hidden');
  }

  // Format index to padded string (e.g. frame_000001.png)
  function getFramePath(index) {
    const padded = String(index + 1).padStart(6, '0');
    return `${FRAME_DIR}/${FRAME_PREFIX}${padded}${FRAME_EXT}`;
  }

  // High-DPI Canvas Resizing
  function resizeCanvas() {
    // High-Definition DPR scaling for ultra-crisp frame rendering
    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    needsRedraw = true;
  }

  // Preload frames asynchronously
  function preloadImages() {
    // 1. Immediately prioritize Frame 0
    const firstImg = new Image();
    firstImg.src = getFramePath(0);
    images[0] = firstImg;

    firstImg.onload = () => {
      loadedFlags[0] = true;
      loadedCount++;
      updateLoader();
      renderFrame(0);
    };

    // 2. Preload remaining in background
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = getFramePath(i);
      images[i] = img;

      img.onload = () => {
        loadedFlags[i] = true;
        loadedCount++;
        updateLoader();
      };

      img.onerror = () => {
        console.warn(`Frame ${i} failed to load`);
      };
    }
  }

  // Update loading bar
  function updateLoader() {
    const percent = Math.min((loadedCount / TOTAL_FRAMES) * 100, 100);
    if (loaderBar) {
      loaderBar.style.width = `${percent}%`;
      if (loadedCount >= TOTAL_FRAMES) {
        setTimeout(() => {
          loaderBar.classList.add('loaded');
        }, 300);
      }
    }
  }

  // Fallback to nearest loaded frame to eliminate flicker
  function getBestAvailableImage(targetIndex) {
    if (loadedFlags[targetIndex] && images[targetIndex]?.complete) {
      return images[targetIndex];
    }

    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const lower = targetIndex - offset;
      if (lower >= 0 && loadedFlags[lower] && images[lower]?.complete) {
        return images[lower];
      }
      const upper = targetIndex + offset;
      if (upper < TOTAL_FRAMES && loadedFlags[upper] && images[upper]?.complete) {
        return images[upper];
      }
    }

    return images[0]?.complete ? images[0] : null;
  }

  // Render canvas frame with 'cover' aspect ratio & centering
  function renderFrame(index) {
    const img = getBestAvailableImage(index);
    if (!img || !img.width || !img.height) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imgWidth = img.naturalWidth || img.width;
    const imgHeight = img.naturalHeight || img.height;

    const scale = Math.max(canvasWidth / imgWidth, canvasHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;
    const offsetX = (canvasWidth - drawWidth) * 0.5;
    const offsetY = (canvasHeight - drawHeight) * 0.5;

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    lastRenderedFrame = index;
  }

  // ------------------------------------------------------------------------
  // Dual Theme Manager: Bright (Light) & Dark Mode
  // ------------------------------------------------------------------------
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('portfolio-theme', theme);
    } catch (e) {}

    if (themeIcon && themeLabel) {
      if (theme === 'light') {
        themeIcon.textContent = '🌙';
        themeLabel.textContent = 'Dark';
        if (themeToggleBtn) themeToggleBtn.setAttribute('title', 'Switch to Dark Mode');
      } else {
        themeIcon.textContent = '☀️';
        themeLabel.textContent = 'Bright';
        if (themeToggleBtn) themeToggleBtn.setAttribute('title', 'Switch to Bright Mode');
      }
    }
  }

  // Default to Bright (light) mode as requested ("do it in the bright format it can good")
  let currentTheme = 'light';
  try {
    currentTheme = localStorage.getItem('portfolio-theme') || 'light';
  } catch (e) {
    currentTheme = 'light';
  }
  applyTheme(currentTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const targetTheme = activeTheme === 'light' ? 'dark' : 'light';
      applyTheme(targetTheme);
    });
  }

  // ------------------------------------------------------------------------
  // Three-Slide Automatic & Interactive Carousel
  // ------------------------------------------------------------------------
  function setActiveSlide(targetIndex) {
    if (targetIndex < 0 || targetIndex >= slides.length) return;
    currentActiveSlide = targetIndex;

    // Update slides visibility
    slides.forEach((slide, idx) => {
      if (idx === targetIndex) {
        slide.classList.add('active');
        slide.setAttribute('aria-hidden', 'false');
      } else {
        slide.classList.remove('active');
        slide.setAttribute('aria-hidden', 'true');
      }
    });

    // Update buttons & ARIA
    slideButtons.forEach((btn, idx) => {
      if (idx === targetIndex) {
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      }
    });

    // Move divider line next to active button
    if (indicatorLine) {
      const activeBtn = slideButtons[targetIndex];
      if (activeBtn) {
        activeBtn.after(indicatorLine);
      }
    }
  }

  function startAutoSlide() {
    stopAutoSlide();
    autoSlideTimer = setInterval(() => {
      // Advance automatically when user is in the hero section and not hovering
      if (!isHoveringHero && window.scrollY < window.innerHeight * 0.6) {
        const nextSlide = (currentActiveSlide + 1) % slides.length;
        setActiveSlide(nextSlide);
      }
    }, 6000); // 6 seconds per slide
  }

  function stopAutoSlide() {
    if (autoSlideTimer) {
      clearInterval(autoSlideTimer);
      autoSlideTimer = null;
    }
  }

  // Interactive Slide Button Click
  slideButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetIndex = parseInt(btn.getAttribute('data-target'), 10);
      setActiveSlide(targetIndex);
      startAutoSlide(); // Reset auto timer
    });
  });

  // Pause on hover
  if (heroStage) {
    heroStage.addEventListener('mouseenter', () => { isHoveringHero = true; });
    heroStage.addEventListener('mouseleave', () => { isHoveringHero = false; });
  }

  // ------------------------------------------------------------------------
  // Scroll & Header Navigation Synchronization
  // ------------------------------------------------------------------------
  function updateScrollProgress() {
    const scrollY = window.scrollY;
    const heroHeight = window.innerHeight;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;

    // Header styling on scroll
    if (siteHeader) {
      if (scrollY > 60) {
        siteHeader.classList.add('scrolled');
      } else {
        siteHeader.classList.remove('scrolled');
      }
    }

    // Scrub target progress based on scroll position
    if (maxScroll > 0) {
      targetProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);
    } else {
      targetProgress = 0;
    }

    // Fade scroll hint once scrolled
    if (scrollHint) {
      if (scrollY > heroHeight * 0.15) {
        scrollHint.style.opacity = '0';
        scrollHint.style.pointerEvents = 'none';
      } else {
        scrollHint.style.opacity = '0.6';
        scrollHint.style.pointerEvents = 'auto';
      }
    }
  }

  // Smooth in-page anchor scrolling with fixed header offset
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerOffset = 70;
        const elementPosition = targetEl.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });

  // ------------------------------------------------------------------------
  // Certificate Viewer Modal Controller
  // ------------------------------------------------------------------------
  const certModal = document.getElementById('cert-modal');
  const btnOpenCert = document.getElementById('btn-open-cert-modal');
  const certThumbTrigger = document.getElementById('cert-thumb-trigger');
  const btnCloseCert = document.getElementById('cert-modal-close-btn');
  const backdropCert = document.getElementById('cert-modal-backdrop');

  function openCertModal() {
    if (certModal) {
      certModal.classList.add('active');
      certModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeCertModal() {
    if (certModal) {
      certModal.classList.remove('active');
      certModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  if (btnOpenCert) btnOpenCert.addEventListener('click', openCertModal);
  if (certThumbTrigger) certThumbTrigger.addEventListener('click', openCertModal);
  if (btnCloseCert) btnCloseCert.addEventListener('click', closeCertModal);
  if (backdropCert) backdropCert.addEventListener('click', closeCertModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && certModal && certModal.classList.contains('active')) {
      closeCertModal();
    }
  });

  // Resume Download Button Interaction
  if (resumeDownloadBtn) {
    resumeDownloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Resume PDF download is available. You can also contact Prateek Tyagi directly at prateektyagi386@gmail.com.');
    });
  }

  // ------------------------------------------------------------------------
  // Working Contact Form Delivery & Direct Gmail Integration
  // ------------------------------------------------------------------------
  const contactForm = document.getElementById('contact-form');
  const formStatus = document.getElementById('form-status');
  const btnSubmitForm = document.getElementById('btn-submit-form');
  const btnDirectGmail = document.getElementById('btn-direct-gmail');
  const btnDirectMailto = document.getElementById('btn-direct-mailto');
  const formSubmitSubject = document.getElementById('form-submit-subject');

  function updateEmailLinks() {
    const name = document.getElementById('form-name')?.value.trim() || '';
    const email = document.getElementById('form-email')?.value.trim() || '';
    const subject = document.getElementById('form-subject')?.value.trim() || 'Portfolio Inquiry';
    const message = document.getElementById('form-message')?.value.trim() || '';

    const bodyText = `Hello Prateek,\n\n${message}\n\n---\nFrom: ${name || 'Website Visitor'}\nEmail: ${email || 'Not provided'}`;
    const encSubject = encodeURIComponent(`[Portfolio Inquiry] ${subject}`);
    const encBody = encodeURIComponent(bodyText);

    // 1. Direct Web Gmail Composer Link (Zero Middleman, 100% Reliable Delivery)
    if (btnDirectGmail) {
      btnDirectGmail.href = `https://mail.google.com/mail/?view=cm&fs=1&to=prateektyagi386@gmail.com&su=${encSubject}&body=${encBody}`;
    }

    // 2. Default System Mail Client Link
    if (btnDirectMailto) {
      btnDirectMailto.href = `mailto:prateektyagi386@gmail.com?subject=${encSubject}&body=${encBody}`;
    }

    // 3. FormSubmit Hidden Subject
    if (formSubmitSubject) {
      formSubmitSubject.value = `[Portfolio Inquiry] ${subject} (from ${name || 'Visitor'})`;
    }
  }

  ['form-name', 'form-email', 'form-subject', 'form-message'].forEach((id) => {
    const inputEl = document.getElementById(id);
    if (inputEl) inputEl.addEventListener('input', updateEmailLinks);
  });

  // Initial call to set links
  updateEmailLinks();

  function showFormStatus(type, message) {
    if (!formStatus) return;
    formStatus.className = `form-status ${type}`;
    formStatus.innerHTML = message;
    formStatus.style.display = 'block';
  }

  if (contactForm) {
    contactForm.addEventListener('submit', () => {
      updateEmailLinks();
      showFormStatus(
        'success',
        '✓ Dispatched to FormSubmit in a new tab!<br><span style="font-size:0.83rem;font-weight:400;display:inline-block;margin-top:6px;line-height:1.5;">• FormSubmit is processing the message for <strong>prateektyagi386@gmail.com</strong>.<br>• <strong>First-Time Activation:</strong> FormSubmit sends a 1-click confirmation email to your Gmail inbox. Click "Activate Form" once to activate forever.<br>• <strong>Direct Send:</strong> You can also click <strong>"Compose in Gmail ↗"</strong> below to send directly through Gmail right now.</span>'
      );
    });
  }

  // ------------------------------------------------------------------------
  // Animation Loop with Fluid Lerping
  // ------------------------------------------------------------------------
  function animate() {
    const lerpFactor = 0.08;
    const delta = targetProgress - currentProgress;

    if (Math.abs(delta) > 0.0001) {
      currentProgress += delta * lerpFactor;
    } else {
      currentProgress = targetProgress;
    }

    // Map progress to frame index (0 -> TOTAL_FRAMES - 1)
    const targetFrameIndex = Math.min(
      Math.floor(currentProgress * (TOTAL_FRAMES - 1)),
      TOTAL_FRAMES - 1
    );

    if (targetFrameIndex !== lastRenderedFrame || needsRedraw) {
      renderFrame(targetFrameIndex);
      needsRedraw = false;
    }

    requestAnimationFrame(animate);
  }

  // Event Listeners
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', () => {
    resizeCanvas();
    needsRedraw = true;
  });

  // Initialization
  resizeCanvas();
  updateScrollProgress();
  currentProgress = targetProgress;
  preloadImages();
  setActiveSlide(0);
  startAutoSlide();
  requestAnimationFrame(animate);

  // ------------------------------------------------------------------------
  // Scroll Progress Bar & Dynamic Content Animations
  // ------------------------------------------------------------------------
  // Add scroll progress bar to top of page
  let progressBar = document.getElementById('page-scroll-progress');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'page-scroll-progress';
    document.body.prepend(progressBar);
  }

  function updateProgressBar() {
    const scrollY = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll > 0) {
      const pct = (scrollY / maxScroll) * 100;
      progressBar.style.width = `${pct}%`;
    }
  }
  window.addEventListener('scroll', updateProgressBar, { passive: true });

  // Attach reveal animations to every content section & card
  function initContentAnimations() {
    const targets = document.querySelectorAll(
      '.section-header, .about-grid > *, .tl-card, .skill-group-card, .exp-card, .project-card, .cert-card, .cert-clean-card, .testi-card, .contact-content-grid > *'
    );

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    targets.forEach((el, idx) => {
      el.classList.add('reveal-init');
      el.classList.add(`stagger-${(idx % 6) + 1}`);
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContentAnimations);
  } else {
    initContentAnimations();
  }

})();