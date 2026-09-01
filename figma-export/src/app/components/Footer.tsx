import { Twitter, Instagram, Facebook, Youtube } from 'lucide-react';
import { useLanguage } from '../utils/i18n';

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-[#161616] text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-[#FF6B00]/20">
      <div className="w-full">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img
                src="/brand/amt-distro-wordmark.svg"
                alt="AMTDISTRO logo"
                className="h-11 w-auto object-contain"
              />
            </div>
            <p className="text-[#B3B3B3]">
              {t('footer.tagline', 'Empowering artists to share their music with the world. 100% of your royalties, 0% of the headaches.')}
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-white font-bold">{t('footer.product', 'Product')}</h4>
            <ul className="space-y-2 text-[#B3B3B3]">
              <li><a href="/#features" className="hover:text-[#FF6B00] transition-colors">{t('footer.features', 'Features')}</a></li>
              <li><a href="/listen" className="hover:text-[#FF6B00] transition-colors">Listener App</a></li>
              <li><a href="/#pricing" className="hover:text-[#FF6B00] transition-colors">{t('footer.pricing', 'Pricing')}</a></li>
              <li><a href="/#how-it-works" className="hover:text-[#FF6B00] transition-colors">{t('footer.howItWorks', 'How It Works')}</a></li>
              <li><a href="/#faq" className="hover:text-[#FF6B00] transition-colors">{t('footer.faq', 'FAQ')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-white font-bold">{t('footer.company', 'Company')}</h4>
            <ul className="space-y-2 text-[#B3B3B3]">
              <li><a href="/who-we-are" className="hover:text-[#FF6B00] transition-colors">{t('footer.aboutUs', 'About Us')}</a></li>
              <li><a href="/blog" className="hover:text-[#FF6B00] transition-colors">{t('footer.blog', 'Blog')}</a></li>
              <li><a href="/careers" className="hover:text-[#FF6B00] transition-colors">{t('footer.careers', 'Careers')}</a></li>
              <li><a href="/contact" className="hover:text-[#FF6B00] transition-colors">{t('footer.contact', 'Contact')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-white font-bold">{t('footer.legal', 'Legal')}</h4>
            <ul className="space-y-2 text-[#B3B3B3]">
              <li><a href="/terms-conditions" className="hover:text-[#FF6B00] transition-colors">{t('footer.terms', 'Terms & Conditions')}</a></li>
              <li><a href="/privacy-policy" className="hover:text-[#FF6B00] transition-colors">{t('footer.privacy', 'Privacy Policy')}</a></li>
              <li><a href="/cookies-policy" className="hover:text-[#FF6B00] transition-colors">{t('footer.cookies', 'Cookies Policy')}</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#FF6B00]/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#B3B3B3]">
            {t('footer.copyright', '© 2026 AMTDISTRO. All rights reserved.')}
          </p>
          <div className="flex gap-4">
            <a href="#" title="Twitter" className="w-10 h-10 rounded-full bg-[#0A0A0A] border border-[#FF6B00]/20 flex items-center justify-center hover:bg-[#FF6B00] hover:border-[#FF6B00] transition-all">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" title="Instagram" className="w-10 h-10 rounded-full bg-[#0A0A0A] border border-[#FF6B00]/20 flex items-center justify-center hover:bg-[#FF6B00] hover:border-[#FF6B00] transition-all">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" title="Facebook" className="w-10 h-10 rounded-full bg-[#0A0A0A] border border-[#FF6B00]/20 flex items-center justify-center hover:bg-[#FF6B00] hover:border-[#FF6B00] transition-all">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" title="YouTube" className="w-10 h-10 rounded-full bg-[#0A0A0A] border border-[#FF6B00]/20 flex items-center justify-center hover:bg-[#FF6B00] hover:border-[#FF6B00] transition-all">
              <Youtube className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}