/**
 * Marvin Appliances - Mobile-Optimized JavaScript
 * Handles touch gestures, responsive behaviors, form submission
 * @version 2.0
 */

(function() {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        touchThreshold: 50,
        scrollThreshold: 100,
        headerHideThreshold: 200,
        vibrateDuration: 10,
        debounceDelay: 250,
        animationDuration: 300
    };

    // ==================== DEVICE DETECTION ====================
    const Device = {
        isTouch: window.matchMedia('(pointer: coarse)').matches,
        isMobile: window.innerWidth < 768,
        isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
        isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
        supportsVibrate: 'vibrate' in navigator,
        supportsIntersectionObserver: 'IntersectionObserver' in window,
        supportsPassiveEvents: (() => {
            let supports = false;
            try {
                const opts = Object.defineProperty({}, 'passive', {
                    get: () => { supports = true; return true; }
                });
                window.addEventListener('test', null, opts);
                window.removeEventListener('test', null, opts);
            } catch (e) {}
            return supports;
        })()
    };

    const passiveOption = Device.supportsPassiveEvents ? { passive: true } : false;

    // ==================== DOM ELEMENTS ====================
    const DOM = {
        header: document.querySelector('.header'),
        menuToggle: document.getElementById('menuToggle'),
        sidebar: document.getElementById('sidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        sidebarLinks: document.querySelectorAll('.sidebar-nav a'),
        faqItems: document.querySelectorAll('.faq-item'),
        forms: document.querySelectorAll('form[data-netlify="true"]'),
        dateInputs: document.querySelectorAll('input[type="date"]'),
        scrollTargets: document.querySelectorAll('a[href^="#"]'),
        touchElements: document.querySelectorAll('.service-card, .cta-button, .submit-btn, .faq-question')
    };

    // ==================== UTILITY FUNCTIONS ====================
    const Utils = {
        debounce: (func, wait) => {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },

        throttle: (func, limit) => {
            let inThrottle;
            return function(...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        vibrate: (pattern = CONFIG.vibrateDuration) => {
            if (Device.isTouch && Device.supportsVibrate) {
                navigator.vibrate(pattern);
            }
        },

        prefersReducedMotion: () => {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        },

        scrollTo: (target, offset = 80) => {
            const element = typeof target === 'string' ? document.querySelector(target) : target;
            if (!element) return;

            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth'
            });
        }
    };

    // ==================== MOBILE MENU ====================
    const Menu = {
        isOpen: false,
        touchStartX: 0,
        touchEndX: 0,

        init() {
            if (!DOM.menuToggle || !DOM.sidebar) return;

            DOM.menuToggle.addEventListener('click', this.toggle.bind(this));
            DOM.sidebarOverlay.addEventListener('click', this.close.bind(this));

            // Close on link click
            DOM.sidebarLinks.forEach(link => {
                link.addEventListener('click', () => this.close());
            });

            // Keyboard escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) this.close();
            });

            // Touch swipe to close
            if (Device.isTouch) {
                DOM.sidebar.addEventListener('touchstart', (e) => {
                    this.touchStartX = e.changedTouches[0].screenX;
                }, passiveOption);

                DOM.sidebar.addEventListener('touchend', (e) => {
                    this.touchEndX = e.changedTouches[0].screenX;
                    if (this.touchStartX - this.touchEndX > CONFIG.touchThreshold) {
                        this.close();
                    }
                }, passiveOption);
            }

            // Close on resize to desktop
            window.addEventListener('resize', Utils.debounce(() => {
                if (window.innerWidth >= 768 && this.isOpen) {
                    this.close();
                }
            }, CONFIG.debounceDelay));
        },

        toggle() {
            this.isOpen = !this.isOpen;
            DOM.sidebar.classList.toggle('active', this.isOpen);
            DOM.sidebarOverlay.classList.toggle('active', this.isOpen);
            document.body.style.overflow = this.isOpen ? 'hidden' : '';
            DOM.menuToggle.setAttribute('aria-expanded', this.isOpen);

            if (this.isOpen) {
                Utils.vibrate();
                // Focus first link for accessibility
                setTimeout(() => DOM.sidebarLinks[0]?.focus(), CONFIG.animationDuration);
            }
        },

        close() {
            if (!this.isOpen) return;
            this.isOpen = false;
            DOM.sidebar.classList.remove('active');
            DOM.sidebarOverlay.classList.remove('active');
            document.body.style.overflow = '';
            DOM.menuToggle.setAttribute('aria-expanded', 'false');
            DOM.menuToggle.focus();
        }
    };

    // ==================== FAQ ACCORDION ====================
    const FAQ = {
        init() {
            DOM.faqItems.forEach(item => {
                const question = item.querySelector('.faq-question');
                if (!question) return;

                question.addEventListener('click', () => this.toggle(item));

                // Touch feedback
                if (Device.isTouch) {
                    question.addEventListener('touchstart', () => {
                        question.style.background = 'var(--lighter)';
                    }, passiveOption);

                    question.addEventListener('touchend', () => {
                        setTimeout(() => {
                            question.style.background = '';
                        }, 100);
                    }, passiveOption);
                }
            });
        },

        toggle(item) {
            const isActive = item.classList.contains('active');

            // Close others (optional accordion behavior)
            DOM.faqItems.forEach(other => {
                if (other !== item && other.classList.contains('active')) {
                    other.classList.remove('active');
                }
            });

            item.classList.toggle('active');

            if (!isActive) {
                Utils.vibrate(5);
                // Scroll into view if needed
                setTimeout(() => {
                    const rect = item.getBoundingClientRect();
                    if (rect.bottom > window.innerHeight) {
                        Utils.scrollTo(item, 100);
                    }
                }, CONFIG.animationDuration);
            }
        }
    };

    // ==================== FORM HANDLING ====================
    const Forms = {
        init() {
            DOM.forms.forEach(form => this.setupForm(form));

            // Set min date to today
            DOM.dateInputs.forEach(input => {
                const today = new Date().toISOString().split('T')[0];
                input.min = today;

                // iOS date picker fix
                if (Device.isIOS) {
                    input.addEventListener('touchstart', (e) => {
                        e.stopPropagation();
                    }, passiveOption);
                }
            });
        },

        setupForm(form) {
            const submitBtn = form.querySelector('.submit-btn');
            const successMsg = form.querySelector('.success-message');
            const originalText = submitBtn?.textContent || 'Submit';

            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                if (!form.checkValidity()) {
                    form.reportValidity();
                    Utils.vibrate([50, 100, 50]);
                    return;
                }

                const formData = new FormData(form);
                const inputs = form.querySelectorAll('input, select, textarea, button');

                // Loading state
                this.setLoadingState(submitBtn, inputs, true);

                try {
                    const response = await fetch('/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams(formData).toString()
                    });

                    if (response.ok) {
                        this.handleSuccess(form, submitBtn, successMsg, originalText, inputs);
                    } else {
                        throw new Error('Submission failed');
                    }
                } catch (error) {
                    this.handleError(submitBtn, originalText, inputs);
                    console.error('Form error:', error);
                }
            });
        },

        setLoadingState(btn, inputs, isLoading) {
            if (btn) {
                btn.textContent = isLoading ? 'Sending...' : btn.textContent;
                btn.disabled = isLoading;
                btn.style.opacity = isLoading ? '0.7' : '1';
            }
            inputs.forEach(input => input.disabled = isLoading);
        },

        handleSuccess(form, btn, successMsg, originalText, inputs) {
            Utils.vibrate([20, 100, 20]);

            if (successMsg) {
                successMsg.classList.add('show');
                successMsg.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            form.reset();

            if (btn) {
                btn.textContent = '✓ Booking Sent!';
                btn.style.background = 'var(--success)';
            }

            setTimeout(() => {
                inputs.forEach(input => input.disabled = false);
                if (btn) {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }
                if (successMsg) {
                    successMsg.classList.remove('show');
                }
            }, 4000);
        },

        handleError(btn, originalText, inputs) {
            Utils.vibrate([100, 50, 100]);

            if (btn) {
                btn.textContent = '❌ Error. Retry?';
                btn.style.background = 'var(--error)';
            }

            inputs.forEach(input => input.disabled = false);

            setTimeout(() => {
                if (btn) {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }
            }, 3000);
        }
    };

    // ==================== SCROLL BEHAVIORS ====================
    const Scroll = {
        lastScroll: 0,
        ticking: false,

        init() {
            // Smooth scroll for anchor links
            DOM.scrollTargets.forEach(anchor => {
                anchor.addEventListener('click', (e) => {
                    e.preventDefault();
                    const target = document.querySelector(anchor.getAttribute('href'));
                    if (target) {
                        Utils.scrollTo(target);
                        // Update URL without jump
                        history.pushState(null, null, anchor.getAttribute('href'));
                    }
                });
            });

            // Header scroll effects
            window.addEventListener('scroll', () => {
                if (!this.ticking) {
                    window.requestAnimationFrame(() => {
                        this.handleScroll();
                        this.ticking = false;
                    });
                    this.ticking = true;
                }
            }, passiveOption);
        },

        handleScroll() {
            const currentScroll = window.pageYOffset;
            const header = DOM.header;

            if (!header) return;

            // Add shadow when scrolled
            if (currentScroll > CONFIG.scrollThreshold) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            // Hide/show header on mobile scroll
            if (Device.isMobile && currentScroll > CONFIG.headerHideThreshold) {
                if (currentScroll > this.lastScroll) {
                    header.classList.add('hidden');
                } else {
                    header.classList.remove('hidden');
                }
            } else {
                header.classList.remove('hidden');
            }

            this.lastScroll = currentScroll;
        }
    };

    // ==================== TOUCH FEEDBACK ====================
    const TouchFeedback = {
        init() {
            if (!Device.isTouch) return;

            DOM.touchElements.forEach(el => {
                el.addEventListener('touchstart', () => {
                    el.style.transform = 'scale(0.98)';
                }, passiveOption);

                el.addEventListener('touchend', () => {
                    el.style.transform = '';
                }, passiveOption);
            });
        }
    };

    // ==================== LAZY LOADING ====================
    const LazyLoad = {
        init() {
            if (!Device.supportsIntersectionObserver) return;

            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            img.classList.add('loaded');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    };

    // ==================== OFFLINE DETECTION ====================
    const Offline = {
        init() {
            window.addEventListener('online', () => {
                console.log('Connection restored');
                document.body.classList.remove('offline');
            });

            window.addEventListener('offline', () => {
                console.log('Connection lost');
                document.body.classList.add('offline');

                // Show subtle notification
                const notification = document.createElement('div');
                notification.className = 'offline-notification';
                notification.textContent = '⚠️ You are offline. Some features may not work.';
                notification.style.cssText = `
                    position: fixed;
                    top: calc(var(--header-height) + 10px);
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--warning);
                    color: var(--dark);
                    padding: 10px 20px;
                    border-radius: 50px;
                    font-size: 14px;
                    font-weight: 600;
                    z-index: 9999;
                    box-shadow: var(--shadow-lg);
                `;
                document.body.appendChild(notification);

                setTimeout(() => notification.remove(), 5000);
            });
        }
    };

    // ==================== INITIALIZATION ====================
    const App = {
        init() {
            // Check for reduced motion preference
            if (Utils.prefersReducedMotion()) {
                document.documentElement.style.scrollBehavior = 'auto';
            }

            // Initialize modules
            Menu.init();
            FAQ.init();
            Forms.init();
            Scroll.init();
            TouchFeedback.init();
            LazyLoad.init();
            Offline.init();

            // Log ready state
            console.log('✅ Marvin Appliances: Mobile-optimized app loaded');
            console.log('📱 Device:', Device.isMobile ? 'Mobile' : 'Desktop', 
                       Device.isTouch ? '(Touch)' : '(Mouse)');
        }
    };

    // Start app when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }

    // Expose to global for debugging
    window.MarvinApp = { Device, Utils, CONFIG };

})();
