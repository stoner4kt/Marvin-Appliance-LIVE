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
                this.clearErrors(form);

                if (!form.checkValidity()) {
                    const errors = this.getValidationErrors(form);
                    this.renderValidationErrors(form, errors);
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
                        throw new Error('We could not submit your booking right now. Please review your details and try again.');
                    }
                } catch (error) {
                    this.handleError(form, submitBtn, originalText, inputs, error.message);
                    console.error('Form error:', error);
                }
            });
        },

        getValidationErrors(form) {
            const fields = form.querySelectorAll('input, select, textarea');
            const errors = [];

            fields.forEach((field, index) => {
                if (field.willValidate && !field.checkValidity()) {
                    const label = this.getFieldLabel(field, index + 1);
                    let message = field.validationMessage;

                    if (field.validity.valueMissing) {
                        message = `Please enter ${label.toLowerCase()}.`;
                    } else if (field.validity.typeMismatch && field.type === 'email') {
                        message = 'Please enter a valid email address so we can contact you.';
                    } else if (field.validity.patternMismatch && field.type === 'tel') {
                        message = 'Please enter a valid phone number so we can call or WhatsApp you.';
                    }

                    errors.push({ field, label, message });
                }
            });

            return errors;
        },

        getFieldLabel(field, fallbackIndex) {
            const fieldId = field.id;
            if (fieldId) {
                const label = field.form?.querySelector(`label[for="${fieldId}"]`);
                if (label) return label.textContent.trim();
            }
            return field.name || `field ${fallbackIndex}`;
        },

        renderValidationErrors(form, errors, summaryMessage) {
            const summary = document.createElement('div');
            summary.className = 'form-error-summary';
            summary.setAttribute('role', 'alert');
            summary.setAttribute('aria-live', 'assertive');
            summary.style.background = 'rgba(220, 53, 69, 0.1)';
            summary.style.border = '1px solid var(--error)';
            summary.style.color = 'var(--error)';
            summary.style.padding = '0.75rem';
            summary.style.borderRadius = '8px';
            summary.style.marginBottom = '1rem';
            summary.style.fontSize = '0.95rem';

            if (summaryMessage) {
                summary.textContent = summaryMessage;
            } else {
                const intro = document.createElement('p');
                intro.textContent = 'Please fix the following before submitting:';
                intro.style.margin = '0 0 0.5rem 0';
                intro.style.fontWeight = '600';
                summary.appendChild(intro);

                const list = document.createElement('ul');
                list.style.margin = '0';
                list.style.paddingLeft = '1rem';

                errors.forEach(({ label, message }) => {
                    const item = document.createElement('li');
                    item.textContent = `${label}: ${message}`;
                    list.appendChild(item);
                });

                summary.appendChild(list);
            }

            form.insertBefore(summary, form.firstChild);

            errors.forEach(({ field, message }, index) => {
                const fieldName = field.name || `field-${index}`;
                const errorId = `${form.name || 'form'}-${fieldName}-error`;
                const error = document.createElement('div');
                error.id = errorId;
                error.className = 'field-error-message';
                error.textContent = message;
                error.style.color = 'var(--error)';
                error.style.fontSize = '0.875rem';
                error.style.marginTop = '0.375rem';

                field.style.borderColor = 'var(--error)';
                field.setAttribute('aria-invalid', 'true');
                field.setAttribute('aria-describedby', errorId);
                field.insertAdjacentElement('afterend', error);
            });

            summary.scrollIntoView({ behavior: 'smooth', block: 'start' });
        },

        clearErrors(form) {
            const summary = form.querySelector('.form-error-summary');
            if (summary) summary.remove();

            form.querySelectorAll('.field-error-message').forEach(error => error.remove());

            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                field.style.borderColor = '';
                field.removeAttribute('aria-invalid');
                field.removeAttribute('aria-describedby');
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
            this.clearErrors(form);

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

        handleError(form, btn, originalText, inputs, message) {
            Utils.vibrate([100, 50, 100]);
            this.renderValidationErrors(form, [], message || 'Something went wrong while sending your booking. Please try again in a moment.');

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
