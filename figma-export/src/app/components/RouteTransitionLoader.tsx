const BRAND_TEXT = 'AMTDISTRO';

export function RouteTransitionLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center px-6 py-8">
      <div className="relative flex flex-col items-center gap-3">
        <div className="amtdistro-glow" aria-hidden="true" />

        <div className="relative z-10 flex items-center gap-1 text-2xl font-black tracking-[0.28em] text-[#FF6B00] sm:text-3xl">
          {Array.from(BRAND_TEXT).map((char, index) => (
            <span
              key={`${char}-${index}`}
              className="amtdistro-letter inline-block animate-[amtdistroFloat_2.4s_ease-in-out_infinite]"
            >
              {char}
            </span>
          ))}
        </div>
        <div className="relative z-10 h-1.5 w-44 overflow-hidden rounded-full bg-[#2A2A2A]">
          <div className="h-full w-1/3 animate-[amtdistroSlide_2.2s_ease-in-out_infinite] rounded-full bg-[#FF6B00]" />
        </div>
      </div>

      <style>{`
        @keyframes amtdistroFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes amtdistroSlide {
          0% { transform: translateX(-120%); }
          50% { transform: translateX(120%); }
          100% { transform: translateX(300%); }
        }

        @keyframes amtdistroGlowPulse {
          0%, 100% { opacity: 0.28; transform: scale(0.92); }
          50% { opacity: 0.52; transform: scale(1.05); }
        }

        .amtdistro-glow {
          position: absolute;
          top: -18px;
          left: 50%;
          width: 240px;
          height: 96px;
          transform: translateX(-50%);
          border-radius: 9999px;
          background: radial-gradient(circle at center, rgba(255, 107, 0, 0.52) 0%, rgba(255, 107, 0, 0.18) 42%, rgba(255, 107, 0, 0) 72%);
          filter: blur(12px);
          animation: amtdistroGlowPulse 3.1s ease-in-out infinite;
          pointer-events: none;
        }

        .amtdistro-letter:nth-child(1) { animation-delay: 0s; }
        .amtdistro-letter:nth-child(2) { animation-delay: 0.11s; }
        .amtdistro-letter:nth-child(3) { animation-delay: 0.22s; }
        .amtdistro-letter:nth-child(4) { animation-delay: 0.33s; }
        .amtdistro-letter:nth-child(5) { animation-delay: 0.44s; }
        .amtdistro-letter:nth-child(6) { animation-delay: 0.55s; }
        .amtdistro-letter:nth-child(7) { animation-delay: 0.66s; }
        .amtdistro-letter:nth-child(8) { animation-delay: 0.77s; }
        .amtdistro-letter:nth-child(9) { animation-delay: 0.88s; }
      `}</style>
    </div>
  );
}
