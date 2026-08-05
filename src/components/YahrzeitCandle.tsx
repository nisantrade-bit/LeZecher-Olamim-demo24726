import React from 'react';
import { motion } from 'framer-motion';
import { Deceased } from '../types';

export function getDeceasedPhoto(deceased?: Deceased | null): string | undefined {
  if (!deceased) return undefined;
  const anyDeceased = deceased as any;
  const img = deceased.image || deceased.imageUrl || deceased.photoUrl || deceased.photo || anyDeceased.image_url || anyDeceased.photo_url;
  if (img && typeof img === 'string') {
    const trimmed = img.trim();
    if (trimmed !== '' && trimmed !== '-' && trimmed !== 'null' && trimmed !== 'undefined') {
      return trimmed;
    }
  }
  return undefined;
}

export interface RealisticFlameProps {
  size?: 'small' | 'normal' | 'large';
  showWax?: boolean;
  isLit?: boolean;
}

export const RealisticFlame: React.FC<RealisticFlameProps> = ({
  size = 'normal',
  showWax = true,
  isLit = true,
}) => {
  const isLarge = size === 'large';
  const isSmall = size === 'small';
  const actuallyLit = Boolean(isLit);

  const containerStyle = isLarge
    ? 'w-8 h-10'
    : isSmall
    ? 'w-5 h-6'
    : 'w-6 h-8';

  const glowStyle = isLarge
    ? 'top-0 w-9 h-9 blur-md bg-amber-400/80'
    : isSmall
    ? 'top-0 w-4 h-4 blur-xs bg-amber-500/60'
    : 'top-0 w-5 h-5 blur-sm bg-amber-500/50';

  const flameStyle = isLarge
    ? 'w-4 h-7'
    : isSmall
    ? 'w-2 h-3.5'
    : 'w-2.5 h-4.5';

  return (
    <div className={`relative ${containerStyle} flex flex-col items-center justify-end shrink-0 select-none pointer-events-none`}>
      {/* Radiant ambient glow */}
      {actuallyLit && (
        <div className={`absolute ${glowStyle} rounded-full animate-pulse`}></div>
      )}

      {/* Animated flame body */}
      {actuallyLit && (
        <motion.div
          className={`relative ${flameStyle} bg-gradient-to-t from-amber-600 via-amber-400 to-yellow-100 rounded-full blur-[0.3px] shadow-[0_0_12px_#f59e0b,0_0_24px_#ff9900,0_0_34px_#ffaa00] origin-bottom z-10`}
          animate={{
            scaleY: [1, 1.25, 0.88, 1.18, 1],
            scaleX: [1, 0.82, 1.18, 0.88, 1],
            rotate: [0, -3.5, 3.5, -1.5, 0],
            x: [0, -0.6, 0.6, -0.6, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <div className={`absolute bottom-0.5 left-0.5 ${isLarge ? 'w-1.5 h-3.5' : isSmall ? 'w-0.5 h-1' : 'w-0.5 h-1.5'} bg-white rounded-full opacity-95 shadow-[0_0_6px_#fff]`}></div>
          <div className={`absolute bottom-0 left-0.5 ${isLarge ? 'w-1 h-2' : isSmall ? 'w-0.5 h-0.5' : 'w-0.5 h-1'} bg-blue-500 rounded-full opacity-80`}></div>
        </motion.div>
      )}

      {/* Candle Body & Wax */}
      {showWax && (
        <div className="relative flex flex-col items-center shrink-0 z-0">
          <div className={`${isSmall ? 'w-3 h-2' : isLarge ? 'w-5 h-3.5' : 'w-4 h-3'} bg-gradient-to-t from-amber-950 via-amber-800 to-amber-700/90 rounded-sm shadow-inner border border-amber-600/50 relative overflow-hidden mt-0.5`}>
            <div className="absolute top-0 left-0.5 w-1 h-1 bg-amber-400/40 rounded-full"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export interface DeceasedPhotoFrameProps {
  deceased?: Deceased | null;
  size?: 'hero' | 'modal' | 'card' | 'card-sm' | 'thumb';
  className?: string;
  lang?: 'he' | 'en' | 'ru';
  showSideCandleLabel?: boolean;
}

export const DeceasedPhotoFrame: React.FC<DeceasedPhotoFrameProps> = ({
  deceased,
  size = 'card',
  className = '',
  lang = 'he',
}) => {
  const photo = getDeceasedPhoto(deceased);
  const [hasError, setHasError] = React.useState<boolean>(false);

  React.useEffect(() => {
    setHasError(false);
  }, [photo, deceased?.id]);

  const hasValidPhoto = Boolean(photo && !hasError);

  // 1. HERO SIZE (DeceasedMemorialPage)
  if (size === 'hero') {
    if (hasValidPhoto && photo) {
      return (
        <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-2xl border-2 border-[#c8a96e] shadow-[0_0_30px_rgba(200,169,110,0.5)] overflow-hidden bg-black/60 shrink-0 relative group ${className}`}>
          <img
            src={photo}
            alt={deceased?.name || 'Deceased photo'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ objectPosition: deceased?.imagePosition || 'center top' }}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
          />
          {/* Small animated flickering candle overlayed on photo */}
          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md border border-amber-400/80 p-1.5 rounded-xl shadow-xl flex items-center justify-center animate-pulse">
            <RealisticFlame size="small" isLit={true} showWax={true} />
          </div>
        </div>
      );
    }

    // Default Placeholder when NO photo exists or image failed to load: Animated flickering Yahrzeit candle widget
    return (
      <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-2xl border-2 border-[#c8a96e] shadow-[0_0_30px_rgba(200,169,110,0.5)] bg-gradient-to-b from-[#1c150c] via-black to-[#131a26] shrink-0 relative flex flex-col items-center justify-center p-3 select-none overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-amber-500/10 rounded-2xl blur-xl animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center justify-center space-y-1">
          <RealisticFlame size="large" isLit={true} showWax={true} />
          <span className="text-[10px] sm:text-xs uppercase font-serif tracking-widest text-[#c8a96e] font-bold text-center mt-1">
            {lang === 'he' ? '🔥 נר נשמה' : lang === 'ru' ? '🔥 Свеча памяти' : '🔥 Yahrzeit Candle'}
          </span>
        </div>
      </div>
    );
  }

  // 2. MODAL SIZE (MemorialDetailsModal / DedicatedStudyModal)
  if (size === 'modal') {
    if (hasValidPhoto && photo) {
      return (
        <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-[#c8a96e] shadow-[0_0_25px_rgba(200,169,110,0.4)] overflow-hidden bg-black/60 shrink-0 relative group ${className}`}>
          <img
            src={photo}
            alt={deceased?.name || 'Deceased photo'}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ objectPosition: deceased?.imagePosition || 'center top' }}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
          />
          {/* Small animated candle badge overlaying photo */}
          <div className="absolute bottom-1.5 right-1.5 bg-black/85 backdrop-blur-md border border-amber-400/80 p-1 rounded-lg shadow-md flex items-center justify-center">
            <RealisticFlame size="small" isLit={true} showWax={true} />
          </div>
        </div>
      );
    }

    // Default Placeholder when NO photo exists: Animated flickering Yahrzeit candle widget inside frame
    return (
      <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-[#c8a96e] shadow-[0_0_25px_rgba(200,169,110,0.4)] bg-gradient-to-b from-[#1c150c] via-black to-[#131a26] shrink-0 relative flex flex-col items-center justify-center p-2 select-none overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-amber-500/10 rounded-2xl blur-lg animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          <RealisticFlame size="normal" isLit={true} showWax={true} />
          <span className="text-[10px] text-[#c8a96e] font-serif font-bold tracking-wider mt-1 text-center">
            {lang === 'he' ? 'נר נשמה' : lang === 'ru' ? 'Свеча памяти' : 'Yahrzeit Candle'}
          </span>
        </div>
      </div>
    );
  }

  // 3. CARD SIZE (BulletinBoard today cards, DedicatedStudyModal header)
  if (size === 'card') {
    if (hasValidPhoto && photo) {
      return (
        <div className={`relative shrink-0 ${className}`}>
          <img
            src={photo}
            alt={deceased?.name || 'Deceased photo'}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-full object-cover border-2 border-amber-400 group-hover:scale-105 transition-transform duration-300 shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.5)]"
            style={{ objectPosition: deceased?.imagePosition || 'center top' }}
            onError={() => setHasError(true)}
          />
          <div className="absolute -bottom-1 -right-1 bg-black/90 border border-amber-400 p-0.5 rounded-full shadow-md flex items-center justify-center">
            <RealisticFlame size="small" isLit={true} showWax={true} />
          </div>
        </div>
      );
    }

    // Default Placeholder when NO photo exists: Animated flickering Yahrzeit candle widget in circle
    return (
      <div className={`w-14 h-14 rounded-full bg-gradient-to-b from-amber-950 via-black to-[#131a26] border-2 border-amber-400 flex flex-col items-center justify-center shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.5)] group-hover:scale-105 transition-transform duration-300 overflow-hidden relative ${className}`}>
        <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-sm animate-pulse"></div>
        <div className="relative z-10">
          <RealisticFlame size="small" isLit={true} showWax={true} />
        </div>
      </div>
    );
  }

  // 4. CARD-SM SIZE (BulletinBoard upcoming cards)
  if (size === 'card-sm') {
    if (hasValidPhoto && photo) {
      return (
        <div className={`relative shrink-0 ${className}`}>
          <img
            src={photo}
            alt={deceased?.name || 'Deceased photo'}
            referrerPolicy="no-referrer"
            className="w-11 h-11 rounded-full object-cover border border-[#c8a96e]/50 group-hover:scale-105 transition-transform duration-300 shrink-0 shadow-md"
            style={{ objectPosition: deceased?.imagePosition || 'center top' }}
            onError={() => setHasError(true)}
          />
          <div className="absolute -bottom-1 -right-1 bg-black/90 border border-amber-400/80 p-0.5 rounded-full shadow flex items-center justify-center">
            <RealisticFlame size="small" isLit={true} showWax={true} />
          </div>
        </div>
      );
    }

    // Default Placeholder when NO photo exists: Animated flickering Yahrzeit candle widget
    return (
      <div className={`w-11 h-11 rounded-full bg-gradient-to-b from-amber-950 via-black to-[#131a26] border border-[#c8a96e]/60 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300 overflow-hidden relative ${className}`}>
        <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-xs animate-pulse"></div>
        <div className="relative z-10">
          <RealisticFlame size="small" isLit={true} showWax={true} />
        </div>
      </div>
    );
  }

  // 5. THUMB SIZE (MemorialBook list items)
  if (hasValidPhoto && photo) {
    return (
      <div className={`relative shrink-0 ${className}`}>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-[#c8a96e]/30 flex items-center justify-center bg-black">
          <img
            src={photo}
            alt={deceased?.name || 'Deceased photo'}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
            style={{ objectPosition: deceased?.imagePosition || 'center top' }}
            onError={() => setHasError(true)}
          />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 bg-black/90 border border-amber-400/80 p-0.5 rounded-full shadow flex items-center justify-center">
          <RealisticFlame size="small" isLit={true} showWax={true} />
        </div>
      </div>
    );
  }

  // Default Placeholder when NO photo exists: Animated flickering Yahrzeit candle widget
  return (
    <div className={`w-10 h-10 rounded-full border border-[#c8a96e]/40 bg-gradient-to-b from-amber-950 via-black to-[#131a26] flex items-center justify-center shrink-0 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-xs animate-pulse"></div>
      <div className="relative z-10">
        <RealisticFlame size="small" isLit={true} showWax={true} />
      </div>
    </div>
  );
};
