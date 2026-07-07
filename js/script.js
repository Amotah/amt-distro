const header = document.getElementById('siteHeader');
const mobileMenu = document.getElementById('mobileMenu');
const mobileOverlay = document.getElementById('mobileOverlay');
const mobileToggle = document.getElementById('mobileMenuToggle');
const mobileClose = document.getElementById('mobileClose');

const isMobileViewport = () => window.matchMedia('(max-width: 767px)').matches;

function openMobileMenu() {
    if (!mobileMenu || !mobileOverlay || !mobileToggle) {
        return;
    }

    mobileMenu.hidden = false;
    mobileOverlay.hidden = false;
    mobileMenu.classList.add('is-open');
    mobileOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    mobileToggle.setAttribute('aria-expanded', 'true');
}

function closeMobileMenu() {
    if (!mobileMenu || !mobileOverlay || !mobileToggle) {
        return;
    }

    mobileMenu.classList.remove('is-open');
    mobileOverlay.classList.remove('is-open');
    mobileMenu.hidden = true;
    mobileOverlay.hidden = true;
    document.body.style.removeProperty('overflow');
    mobileToggle.setAttribute('aria-expanded', 'false');
}

if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        if (!mobileMenu || !mobileMenu.classList.contains('is-open')) {
            openMobileMenu();
            return;
        }

        closeMobileMenu();
    });
}

if (mobileClose) {
    mobileClose.addEventListener('click', closeMobileMenu);
}

if (mobileOverlay) {
    mobileOverlay.addEventListener('click', closeMobileMenu);
}

if (mobileMenu) {
    mobileMenu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', closeMobileMenu);
    });
}

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        closeMobileMenu();
    }
});

window.addEventListener('resize', () => {
    if (!isMobileViewport()) {
        closeMobileMenu();
    }
});

window.addEventListener('scroll', () => {
    if (!header) {
        return;
    }

    header.classList.toggle('scrolled', window.scrollY > 8);
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
        const href = anchor.getAttribute('href');
        if (!href || href.length < 2) {
            return;
        }

        const target = document.querySelector(href);
        if (!target) {
            return;
        }

        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
});

document.querySelectorAll('.faq-question').forEach((button) => {
    button.addEventListener('click', () => {
        const item = button.closest('.faq-item');
        if (!item) {
            return;
        }

        const isOpen = item.classList.contains('open');
        item.classList.toggle('open', !isOpen);
        button.setAttribute('aria-expanded', String(!isOpen));
    });
});
