/**
 * HelpTooltip — contextual "?" icon next to form fields.
 *
 * Usage:
 *   <HelpTooltip content="ISRC - Unique code for your track (auto-generated if left blank)" />
 *
 * Props:
 *   content  — tooltip text or JSX
 *   side     — placement: top | right | bottom | left (default: top)
 *   size     — sm | md (default: sm)
 */
import { HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface HelpTooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  size?: 'sm' | 'md';
  className?: string;
}

export function HelpTooltip({ content, side = 'top', size = 'sm', className = '' }: HelpTooltipProps) {
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          tabIndex={0}
          aria-label="Show help"
          className={`inline-flex items-center justify-center rounded-full text-[#555] hover:text-[#FF6B00]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]/50 transition-colors ${className}`}
        >
          <HelpCircle className={iconSize} />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={6}
        className="max-w-[220px] rounded-lg border border-[#FF6B00]/20 bg-[#161616] px-3 py-2 text-xs text-[#D6D6D6] shadow-xl leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
