/**
 * SkipLink — "Skip to main content" accessibility link.
 * Visually hidden until focused via keyboard (Tab). Place at the very top of
 * every page layout so keyboard users can bypass the navigation.
 *
 * Usage:
 *   <SkipLink targetId="main-content" />
 *   <main id="main-content" tabIndex={-1}> … </main>
 */
interface SkipLinkProps {
  /** The id of the main content element to skip to */
  targetId?: string;
  label?: string;
}

export function SkipLink({ targetId = 'main-content', label = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className="
        sr-only
        focus:not-sr-only
        focus:fixed
        focus:left-4
        focus:top-4
        focus:z-[99999]
        focus:flex
        focus:items-center
        focus:gap-2
        focus:rounded-lg
        focus:border
        focus:border-[#FF6B00]/40
        focus:bg-[#161616]
        focus:px-4
        focus:py-2.5
        focus:text-sm
        focus:font-semibold
        focus:text-[#FF6B00]
        focus:shadow-2xl
        focus:outline-none
        focus:ring-2
        focus:ring-[#FF6B00]
      "
    >
      {label}
    </a>
  );
}
