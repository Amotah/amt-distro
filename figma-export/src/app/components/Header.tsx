import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  CircleHelp,
  Globe,
  Home,
  Info,
  Layers3,
  LogIn,
  Megaphone,
  Menu,
  Rocket,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { Button } from './ui/button';
import { LANGUAGE_OPTIONS, setLanguage, useLanguage, type SupportedLanguage } from '../utils/i18n';

interface HeaderProps {
  onNavigate?: (page: string) => void;
}

export function Header({ onNavigate }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const [aboutDropdown, setAboutDropdown] = useState(false);
  const [solutionsDropdown, setSolutionsDropdown] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.removeProperty('overflow');
      return;
    }

    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.removeProperty('overflow');
    };
  }, [mobileMenuOpen]);

  const handleLanguageChange = (languageCode: SupportedLanguage) => {
    setLanguage(languageCode);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
    setMobileAboutOpen(false);
    setMobileSolutionsOpen(false);
  };

  const handleNavClick = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
    closeMobileMenu();
  };

  const handleRouteClick = (page: 'login' | 'get-started') => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      const targetPath = page === 'login' ? '/login' : '/get-started';
      window.history.pushState({}, '', targetPath);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }

    closeMobileMenu();
  };

  const handleHashNavigate = (sectionId: string) => {
    if (onNavigate) {
      onNavigate('landing');
    }

    const targetHash = `#${sectionId}`;
    const nextUrl = `/${targetHash}`;
    if (window.location.pathname === '/' && window.location.hash === targetHash) {
      closeMobileMenu();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }

    window.history.pushState({}, '', nextUrl);
    closeMobileMenu();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const isActivePath = (paths: string[]) => paths.includes(currentPath);

  const mobileNavItemClass = (isActive = false) =>
    `mobile-nav-item${isActive ? ' is-active' : ''}`;

  const mobileSubItemClass = (isActive = false) =>
    `mobile-nav-subitem${isActive ? ' is-active' : ''}`;

  const navLinkClass = 'premium-nav-link';
  const dropdownItemClass = 'block w-full text-left px-4 py-2 text-[#C8C8C8] hover:bg-white/10 hover:text-white transition-colors';

  return (
    <header className="premium-header">
      <div className="premium-header__inner">
        <div className="hidden h-14 items-center justify-between md:h-[3.6rem] lg:flex">

          {/* ── Left: Logo ─────────────────────────────────────────────────── */}
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="group relative">
              <a
                href="/"
                onClick={() => handleNavClick('landing')}
                className="premium-header__brand shrink-0"
                aria-label="AMT DISTRO - go to home"
              >
                <img src="/brand/amt-distro-wordmark.svg" alt="AMTDISTRO logo" className="premium-header__logo" />
              </a>
              <a href="/" className="logo-home-link-chip" onClick={() => handleNavClick('landing')}>
                https://amtdistro.com/
              </a>
            </div>
          </div>

          {/* ── Center: Desktop Navigation ─────────────────────────────── */}
          <nav className="premium-header__menu hidden lg:flex items-center gap-1 xl:gap-1">
            
            {/* About Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setAboutDropdown(true)}
              onMouseLeave={() => setAboutDropdown(false)}
            >
              <button className={navLinkClass}>
                {t('nav.about', 'About')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {aboutDropdown && (
                <div className="premium-header__dropdown absolute top-full left-0 mt-2 w-48 py-2 z-50">
                  <button onClick={() => handleNavClick('who-we-are')} className={dropdownItemClass}>
                    Who We Are
                  </button>
                  <button onClick={() => handleNavClick('our-partners')} className={dropdownItemClass}>
                    Our Partners
                  </button>
                  <button onClick={() => handleNavClick('ceo-message')} className={dropdownItemClass}>
                    Message from CEO
                  </button>
                </div>
              )}
            </div>

            {/* Solutions Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setSolutionsDropdown(true)}
              onMouseLeave={() => setSolutionsDropdown(false)}
            >
              <button className={navLinkClass}>
                {t('nav.solutions', 'Solutions')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {solutionsDropdown && (
                <div className="premium-header__dropdown absolute top-full left-0 mt-2 w-56 py-2 z-50">
                  <button onClick={() => handleNavClick('technology')} className={dropdownItemClass}>
                    Technology
                  </button>
                  <button onClick={() => handleNavClick('marketing-solutions')} className={dropdownItemClass}>
                    Marketing
                  </button>
                  <button onClick={() => handleNavClick('video-distribution')} className={dropdownItemClass}>
                    Music Video Distribution
                  </button>
                  <button onClick={() => handleNavClick('rights-management')} className={dropdownItemClass}>
                    Rights Management
                  </button>
                  <button onClick={() => handleNavClick('royalty-advances')} className={dropdownItemClass}>
                    Royalty Advances
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => handleNavClick('our-partners')} className={navLinkClass}>{t('nav.partners', 'Partners')}</button>
            <button onClick={() => handleNavClick('promotion')} className={navLinkClass}>{t('nav.promotion', 'Promotion')}</button>
            <button onClick={() => handleNavClick('pricing')} className={navLinkClass}>{t('nav.pricing', 'Pricing')}</button>
            <button onClick={() => handleHashNavigate('faq')} className={navLinkClass}>{t('nav.faq', 'FAQ')}</button>
            <button onClick={() => handleNavClick('blog')} className={navLinkClass}>{t('nav.blog', 'Blog')}</button>
          </nav>

          {/* ── Right: Language + Auth ──────────────────────────────────── */}
          <div className="premium-header__auth hidden lg:flex items-center gap-2 xl:gap-3">
            <label className="sr-only" htmlFor="site-language-desktop">{t('nav.language', 'Language')}</label>
            <select
              id="site-language-desktop"
              value={language}
              onChange={(event) => handleLanguageChange(event.target.value as SupportedLanguage)}
              className="rounded-full border border-white/15 bg-[#101010] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#D6D6D6] outline-none transition-colors focus:border-[#00E5FF]"
            >
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
            <Button variant="ghost" className="rounded-full font-semibold text-white hover:text-[#00E5FF]" onClick={() => handleRouteClick('login')}>{t('nav.signIn', 'Sign In')}</Button>
            <Button className="rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] font-semibold text-black hover:opacity-90" onClick={() => handleRouteClick('get-started')}>{t('nav.getStarted', 'Get Started')}</Button>
          </div>

        </div>

        <div className="relative flex h-14 items-center justify-between lg:hidden">
          <button
            type="button"
            className="mobile-header-row__menu-button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-controls="mobile-site-menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <a
            href="/"
            onClick={() => handleNavClick('landing')}
            className="absolute left-1/2 inline-flex -translate-x-1/2 items-center justify-center"
            aria-label="AMT DISTRO - go to home"
          >
            <img src="/brand/amt-distro-wordmark.svg" alt="AMTDISTRO logo" className="mobile-header-row__logo" />
          </a>

          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] px-3 py-1.5 text-xs font-semibold text-black"
            onClick={() => handleRouteClick('get-started')}
          >
            Start
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            className="mobile-nav-backdrop is-open lg:hidden"
            onClick={closeMobileMenu}
          >
            <aside
              id="mobile-site-menu"
              className="mobile-nav-panel is-open"
              onClick={(event) => event.stopPropagation()}
              aria-label="Mobile navigation"
            >
            <div className="mobile-nav-panel__top">
              <button
                type="button"
                className="mobile-nav-panel__close"
                onClick={closeMobileMenu}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mobile-nav-list">
              <button className={mobileNavItemClass(isActivePath(['/']))} onClick={() => handleNavClick('landing')}>
                <Home className="h-4 w-4" />
                <span>Home</span>
              </button>

              <button
                className={mobileNavItemClass(isActivePath(['/who-we-are', '/our-partners', '/ceo-message']))}
                onClick={() => setMobileAboutOpen((prev) => !prev)}
              >
                <Info className="h-4 w-4" />
                <span>{t('nav.about', 'About')}</span>
                <ChevronDown className={`mobile-nav-chevron ${mobileAboutOpen ? 'is-open' : ''}`} />
              </button>
              <div className={`mobile-nav-submenu ${mobileAboutOpen ? 'is-open' : ''}`}>
                <button className={mobileSubItemClass(isActivePath(['/who-we-are']))} onClick={() => handleNavClick('who-we-are')}>Who We Are</button>
                <button className={mobileSubItemClass(isActivePath(['/our-partners']))} onClick={() => handleNavClick('our-partners')}>Our Partners</button>
                <button className={mobileSubItemClass(isActivePath(['/ceo-message']))} onClick={() => handleNavClick('ceo-message')}>Message from CEO</button>
              </div>

              <button
                className={mobileNavItemClass(isActivePath(['/technology', '/marketing-solutions', '/video-distribution', '/rights-management', '/royalty-advances']))}
                onClick={() => setMobileSolutionsOpen((prev) => !prev)}
              >
                <Layers3 className="h-4 w-4" />
                <span>{t('nav.solutions', 'Solutions')}</span>
                <ChevronDown className={`mobile-nav-chevron ${mobileSolutionsOpen ? 'is-open' : ''}`} />
              </button>
              <div className={`mobile-nav-submenu ${mobileSolutionsOpen ? 'is-open' : ''}`}>
                <button className={mobileSubItemClass(isActivePath(['/technology']))} onClick={() => handleNavClick('technology')}>Technology</button>
                <button className={mobileSubItemClass(isActivePath(['/marketing-solutions']))} onClick={() => handleNavClick('marketing-solutions')}>Marketing</button>
                <button className={mobileSubItemClass(isActivePath(['/video-distribution']))} onClick={() => handleNavClick('video-distribution')}>Music Video Distribution</button>
                <button className={mobileSubItemClass(isActivePath(['/rights-management']))} onClick={() => handleNavClick('rights-management')}>Rights Management</button>
                <button className={mobileSubItemClass(isActivePath(['/royalty-advances']))} onClick={() => handleNavClick('royalty-advances')}>Royalty Advances</button>
              </div>

              <button className={mobileNavItemClass(isActivePath(['/our-partners']))} onClick={() => handleNavClick('our-partners')}>
                <Users className="h-4 w-4" />
                <span>{t('nav.partners', 'Partners')}</span>
              </button>

              <button className={mobileNavItemClass(isActivePath(['/promotion']))} onClick={() => handleNavClick('promotion')}>
                <Megaphone className="h-4 w-4" />
                <span>{t('nav.promotion', 'Promotion')}</span>
              </button>

              <button className={mobileNavItemClass(isActivePath(['/pricing']))} onClick={() => handleNavClick('pricing')}>
                <Tag className="h-4 w-4" />
                <span>{t('nav.pricing', 'Pricing')}</span>
              </button>

              <button className={mobileNavItemClass(currentPath === '/' && window.location.hash === '#faq')} onClick={() => handleHashNavigate('faq')}>
                <CircleHelp className="h-4 w-4" />
                <span>{t('nav.faq', 'FAQ')}</span>
              </button>

              <button className={mobileNavItemClass(isActivePath(['/blog']))} onClick={() => handleNavClick('blog')}>
                <BookOpen className="h-4 w-4" />
                <span>{t('nav.blog', 'Blog')}</span>
              </button>

              <div className="mobile-nav-divider" />

              <label className="mobile-nav-language-label" htmlFor="site-language-mobile">
                <Globe className="h-4 w-4" />
                <span>{t('nav.language', 'Language')}</span>
              </label>
              <select
                id="site-language-mobile"
                value={language}
                onChange={(event) => handleLanguageChange(event.target.value as SupportedLanguage)}
                className="mobile-nav-language-select"
              >
                {LANGUAGE_OPTIONS.map((languageOption) => (
                  <option key={languageOption.code} value={languageOption.code}>
                    {languageOption.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="mobile-nav-signin"
                onClick={() => handleRouteClick('login')}
              >
                <LogIn className="h-4 w-4" />
                <span>{t('nav.signIn', 'Sign In')}</span>
              </button>

              <button
                type="button"
                className="mobile-nav-get-started"
                onClick={() => handleRouteClick('get-started')}
              >
                <Rocket className="h-4 w-4" />
                <span>{t('nav.getStarted', 'Get Started')}</span>
              </button>
            </nav>
            </aside>
          </div>
        )}
      </div>
    </header>
  );
}