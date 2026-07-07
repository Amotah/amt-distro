import { useEffect, useMemo, useState } from 'react';

type BreadcrumbItem = {
  label: string;
  href?: string;
  disabled?: boolean;
};

interface PublicBreadcrumbProps {
  currentView: string;
  onNavigate: (page: string) => void;
}

const VIEW_LABELS: Record<string, string> = {
  landing: 'Home',
  'who-we-are': 'Who We Are',
  'our-partners': 'Our Partners',
  'ceo-message': 'Message from CEO',
  technology: 'Technology',
  'marketing-solutions': 'Marketing',
  'video-distribution': 'Music Distribution',
  'rights-management': 'Rights Management',
  'royalty-advances': 'Royalty Advances',
  promotion: 'Promotion',
  pricing: 'Pricing',
  blog: 'Blog',
  contact: 'Contact',
  careers: 'Careers',
  'terms-conditions': 'Terms & Conditions',
  'privacy-policy': 'Privacy Policy',
  'cookies-policy': 'Cookies Policy',
  faq: 'FAQ',
};

function slugToTitle(slug: string) {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toViewFromPath(pathname: string, currentView: string) {
  if (pathname.startsWith('/blog/')) {
    return 'blog-article';
  }

  return currentView;
}

function getFullBreadcrumb(pathname: string, hash: string, currentView: string): BreadcrumbItem[] {
  if (pathname === '/' && hash === '#faq') {
    return [
      { label: 'Home', href: '/' },
      { label: 'FAQ' },
    ];
  }

  const resolvedView = toViewFromPath(pathname, currentView);

  if (resolvedView === 'landing') {
    return [{ label: 'Home' }];
  }

  if (resolvedView === 'blog-article') {
    const articleSlug = pathname.split('/').filter(Boolean)[1] || 'article';
    return [
      { label: 'Home', href: '/' },
      { label: 'Blog', href: '/blog' },
      { label: slugToTitle(articleSlug) },
    ];
  }

  const currentLabel = VIEW_LABELS[resolvedView] || 'Page';

  if (['technology', 'marketing-solutions', 'video-distribution', 'rights-management', 'royalty-advances'].includes(resolvedView)) {
    return [
      { label: 'Home', href: '/' },
      { label: 'Solutions', href: '/marketing-solutions' },
      { label: currentLabel },
    ];
  }

  if (['who-we-are', 'our-partners', 'ceo-message'].includes(resolvedView)) {
    return [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/who-we-are' },
      { label: currentLabel },
    ];
  }

  return [
    { label: 'Home', href: '/' },
    { label: currentLabel },
  ];
}

function buildSchemaItems(items: BreadcrumbItem[]) {
  if (typeof window === 'undefined') {
    return null;
  }

  const origin = window.location.origin;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const fallbackHref = index === 0 ? '/' : window.location.pathname;
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: `${origin}${item.href || fallbackHref}`,
      };
    }),
  };
}

export function PublicBreadcrumb({ currentView, onNavigate }: PublicBreadcrumbProps) {
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window === 'undefined' ? 1280 : window.innerWidth));
  const [locationState, setLocationState] = useState<{ pathname: string; hash: string }>(() => {
    if (typeof window === 'undefined') {
      return { pathname: '/', hash: '' };
    }

    return { pathname: window.location.pathname, hash: window.location.hash };
  });

  useEffect(() => {
    const updateLocation = () => {
      setLocationState({ pathname: window.location.pathname, hash: window.location.hash });
    };

    const onResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('popstate', updateLocation);
    window.addEventListener('hashchange', updateLocation);
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('popstate', updateLocation);
      window.removeEventListener('hashchange', updateLocation);
      window.removeEventListener('resize', onResize);
    };
  }, []);

function estimateBreadcrumbLength(items: BreadcrumbItem[]) {
  const labelChars = items.reduce((total, item) => total + item.label.length, 0);
  const separators = Math.max(items.length - 1, 0) * 3;
  return labelChars + separators;
}

function getTabletBreadcrumbItems(items: BreadcrumbItem[], viewportWidth: number) {
  if (items.length <= 3) {
    return items;
  }

  const fullBudget = viewportWidth >= 1024 ? 84 : 64;
  if (estimateBreadcrumbLength(items) <= fullBudget) {
    return items;
  }

  const lastThreeItems = items.slice(-3);
  const tailBudget = viewportWidth >= 980 ? 50 : 40;
  if (estimateBreadcrumbLength(lastThreeItems) <= tailBudget) {
    return lastThreeItems;
  }

  return [items[0], { label: '...', disabled: true }, items[items.length - 1]];
}

  const fullItems = useMemo(
    () => getFullBreadcrumb(locationState.pathname, locationState.hash, currentView),
    [currentView, locationState.hash, locationState.pathname],
  );

  const desktopItems = fullItems;
  const tabletItems = getTabletBreadcrumbItems(fullItems, viewportWidth);

  const mobileItems = fullItems.length > 2
    ? [fullItems[0], fullItems[fullItems.length - 1]]
    : fullItems;

  const renderedItems = viewportWidth >= 1200 ? desktopItems : viewportWidth >= 768 ? tabletItems : mobileItems;
  const parentItem = fullItems.length > 1 ? fullItems[fullItems.length - 2] : undefined;
  const schemaJson = buildSchemaItems(fullItems);

  const handleNavigate = (href: string) => {
    if (href === '/') {
      onNavigate('landing');
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }

    if (href.startsWith('/#')) {
      window.history.pushState({}, '', href);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }

    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <>
      <nav className="site-breadcrumb" aria-label="breadcrumb">
        {viewportWidth < 768 && parentItem?.href && (
          <button
            type="button"
            className="site-breadcrumb__mobile-back"
            onClick={() => handleNavigate(parentItem.href as string)}
          >
            {`\u2190 ${parentItem.label}`}
          </button>
        )}

        <ol className="site-breadcrumb__list">
          {renderedItems.map((item, index) => {
            const isCurrent = index === renderedItems.length - 1;
            const isClickable = Boolean(item.href) && !isCurrent && !item.disabled;

            return (
              <li key={`${item.label}-${index}`} className="site-breadcrumb__item">
                {isClickable ? (
                  <a
                    href={item.href}
                    className="site-breadcrumb__link"
                    onClick={(event) => {
                      event.preventDefault();
                      handleNavigate(item.href as string);
                    }}
                  >
                    {item.label}
                  </a>
                ) : (
                  <span
                    className={`site-breadcrumb__text${isCurrent ? ' is-current' : ''}${item.disabled ? ' is-disabled' : ''}`}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    {item.label}
                  </span>
                )}

                {index < renderedItems.length - 1 && (
                  <span className="site-breadcrumb__separator" aria-hidden="true">
                    {'>'}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {schemaJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
        />
      )}
    </>
  );
}