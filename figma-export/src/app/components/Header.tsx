import { Menu, X } from 'lucide-react';
import { Button } from './ui/button';
import { useState } from 'react';
import { LANGUAGE_OPTIONS, setLanguage, useLanguage, type SupportedLanguage } from '../utils/i18n';

interface HeaderProps {
  onNavigate?: (page: string) => void;
}

export function Header({ onNavigate }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [aboutDropdown, setAboutDropdown] = useState(false);
  const [solutionsDropdown, setSolutionsDropdown] = useState(false);
  const [mobileAboutOpen, setMobileAboutOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);
  const { language, t } = useLanguage();

  const handleLanguageChange = (languageCode: SupportedLanguage) => {
    setLanguage(languageCode);
  };

  const handleNavClick = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    }
    setMobileMenuOpen(false);
    setMobileAboutOpen(false);
    setMobileSolutionsOpen(false);
  };

  const navLinkClass = 'premium-nav-link';
  const dropdownItemClass = 'block w-full text-left px-4 py-2 text-[#C8C8C8] hover:bg-white/10 hover:text-white transition-colors';

  return (
    <header className="premium-header">
      <div className="premium-header__inner">
        <div className="flex items-center justify-between h-14 md:h-[3.6rem]">

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
            <a href="/#pricing" className={navLinkClass}>{t('nav.pricing', 'Pricing')}</a>
            <a href="/#faq" className={navLinkClass}>{t('nav.faq', 'FAQ')}</a>
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
            <Button variant="ghost" className="rounded-full font-semibold text-white hover:text-[#00E5FF]" onClick={() => window.location.href = '/login'}>{t('nav.signIn', 'Sign In')}</Button>
            <Button className="rounded-full bg-gradient-to-r from-[#FF6B00] to-[#FFD600] font-semibold text-black hover:opacity-90" onClick={() => window.location.href = '/get-started'}>{t('nav.getStarted', 'Get Started')}</Button>
          </div>

          {/* ── Mobile right: hamburger ──────────────────────────────────── */}
          <div className="lg:hidden flex items-center gap-1">
            <button
              className="rounded-xl border border-white/15 bg-white/[0.04] p-2 text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-white/12">
            <nav className="flex flex-col gap-4">
              <div className="rounded-xl border border-white/12 bg-[#101010]">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[#B3B3B3] hover:text-[#00E5FF] transition-colors"
                  onClick={() => setMobileAboutOpen((prev) => !prev)}
                >
                  <span>{t('nav.about', 'About')}</span>
                  <svg className={`h-4 w-4 transition-transform ${mobileAboutOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileAboutOpen && (
                  <div className="border-t border-white/10 px-2 py-2">
                    <button onClick={() => handleNavClick('who-we-are')} className="block w-full rounded-md px-2 py-2 text-left text-sm text-[#B3B3B3] hover:bg-white/10 hover:text-white">
                      Who We Are
                    </button>
                    <button onClick={() => handleNavClick('our-partners')} className="block w-full rounded-md px-2 py-2 text-left text-sm text-[#B3B3B3] hover:bg-white/10 hover:text-white">
                      Our Partners
                    </button>
                    <button onClick={() => handleNavClick('ceo-message')} className="block w-full rounded-md px-2 py-2 text-left text-sm text-[#B3B3B3] hover:bg-white/10 hover:text-white">
                      Message from CEO
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-white/12 bg-[#101010]">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-[#B3B3B3] hover:text-[#00E5FF] transition-colors"
                  onClick={() => setMobileSolutionsOpen((prev) => !prev)}
                >
                  <span>{t('nav.solutions', 'Solutions')}</span>
                  <svg className={`h-4 w-4 transition-transform ${mobileSolutionsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileSolutionsOpen && (
                  <div className="border-t border-white/10 px-2 py-2">
                    <button onClick={() => handleNavClick('technology')} className="block w-full rounded-md px-2 py-2 text-left text-sm text-[#B3B3B3] hover:bg-white/10 hover:text-white">
                      Technology
                    </button>
                    <button onClick={() => handleNavClick('marketing-solutions')} className="block w-full rounded-md px-2 py-2 text-left text-sm text-[#B3B3B3] hover:bg-white/10 hover:text-white">
                      Marketing
                    </button>
                    <button onClick={() => handleNavClick('video-distribution')} className="block w-full rounded-md px-2 py-2 text-left text-sm text-[#B3B3B3] hover:bg-white/10 hover:text-white">
                      Music Video Distribution
                    </button>
                    <button onClick={() => handleNavClick('rights-management')} className="block w-full rounded-md px-2 py-2 text-left text-sm text-[#B3B3B3] hover:bg-white/10 hover:text-white">
                      Rights Management
                    </button>
                    <button onClick={() => handleNavClick('royalty-advances')} className="block w-full rounded-md px-2 py-2 text-left text-sm text-[#B3B3B3] hover:bg-white/10 hover:text-white">
                      Royalty Advances
                    </button>
                  </div>
                )}
              </div>
              <a
                href="/#pricing"
                className="text-[#B3B3B3] hover:text-[#00E5FF] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.pricing', 'Pricing')}
              </a>
              <button
                className="text-[#B3B3B3] hover:text-[#00E5FF] transition-colors text-left"
                onClick={() => { handleNavClick('our-partners'); }}
              >
                {t('nav.partners', 'Partners')}
              </button>
              <button
                className="text-[#B3B3B3] hover:text-[#00E5FF] transition-colors text-left"
                onClick={() => { handleNavClick('promotion'); }}
              >
                {t('nav.promotion', 'Promotion')}
              </button>
              <a
                href="/#faq"
                className="text-[#B3B3B3] hover:text-[#00E5FF] transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('nav.faq', 'FAQ')}
              </a>
              <button
                className="text-[#B3B3B3] hover:text-[#00E5FF] transition-colors text-left"
                onClick={() => { handleNavClick('blog'); }}
              >
                {t('nav.blog', 'Blog')}
              </button>
              <div className="pt-2">
                <label className="mb-1 block text-sm font-medium text-[#B3B3B3]" htmlFor="site-language-mobile">{t('nav.language', 'Language')}</label>
                <select
                  id="site-language-mobile"
                  value={language}
                  onChange={(event) => handleLanguageChange(event.target.value as SupportedLanguage)}
                  className="w-full rounded-md border border-white/15 bg-[#111111] px-3 py-2 text-sm font-medium text-[#D6D6D6] outline-none transition-colors focus:border-[#00E5FF]"
                >
                  {LANGUAGE_OPTIONS.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <Button variant="ghost" className="text-white hover:text-[#00E5FF]" onClick={() => window.location.href = '/login'}>{t('nav.signIn', 'Sign In')}</Button>
                <Button className="bg-gradient-to-r from-[#FF6B00] to-[#FFD600] text-black hover:opacity-90" onClick={() => window.location.href = '/get-started'}>{t('nav.getStarted', 'Get Started')}</Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}