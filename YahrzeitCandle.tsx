import React from 'react';
import { motion } from 'framer-motion';
import { Deceased } from '../types';

export function getDeceasedPhoto(deceased?: Deceased | null): string | undefined {
  if (!deceased) return undefined;
  const anyDeceased = deceased as any;
  const img = deceased.image || deceased.imageUrl || deceased.photoUrl || deceased.photo || anyDeceased.image_url || anyDeceased.photo_url;
  if (img && typeof img === 'string') {
    const trimmed = img.trim();
    if (!trimmed) return undefined;

    const lower = trimmed.toLowerCase();
    if (
      lower === '-' ||
      lower === 'null' ||
      lower === 'undefined' ||
      lower === 'none' ||
      lower === 'no' ||
      lower === 'false' ||
      lower === '0' ||
      lower.includes('placeholder') ||
      lower.includes('default') ||
      lower.includes('avatar') ||
      lower.includes('no_image') ||
      lower.includes('no-image') ||
      lower.includes('no_photo') ||
      lower.includes('no-photo') ||
      lower.includes('og-banner') ||
      lower.includes('icon-192') ||
      lower.includes('icon-512') ||
      lower.includes('apple-touch-icon') ||
      lower.includes('dummy') ||
      lower.includes('anonymous')
    ) {
      return undefined;
    }

    if (
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('data:image/') ||
      lower.startsWith('blob:') ||
      lower.startsWith('/')
    ) {
      return trimmed;
    }
  }
  return undefined;
}

export const AnonymousMaleAvatar: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#131720" stroke="#c8a96e" strokeWidth="2" strokeOpacity="0.4" />
    <path
      d="M50 22 C40 22 33 29 33 39 C33 49 40 55 50 55 C60 55 67 49 67 39 C67 29 60 22 50 22 Z"
      fill="#c8a96e"
      fillOpacity="0.8"
    />
    <path
      d="M20 82 C20 68 32 60 50 60 C68 60 80 68 80 82 Z"
      fill="#c8a96e"
      fillOpacity="0.7"
    />
  </svg>
);

export const AnonymousFemaleAvatar: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#131720" stroke="#c8a96e" strokeWidth="2" strokeOpacity="0.4" />
    <path
      d="M50 18 C38 18 30 26 30 38 C30 46 35 53 42 55 C42 58 38 60 30 63 C22 66 18 73 18 80 L82 80 C82 73 78 66 70 63 C62 60 58 58 58 55 C65 53 70 46 70 38 C70 26 62 18 50 18 Z"
      fill="#c8a96e"
      fillOpacity="0.8"
    />
    <path
      d="M32 33 C32 23 40 20 50 20 C60 20 68 23 68 33 C68 38 65 46 50 49 C35 46 32 38 32 33 Z"
      fill="#e0c38c"
      fillOpacity="0.9"
    />
  </svg>
);

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
  const isFemale = deceased?.gender === 'female' ||
    String(deceased?.gender || '').toLowerCase().includes('female') ||
    String(deceased?.gender || '').includes('נקבה');

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
        </div>
      );
    }

    // Default Placeholder when NO photo exists: Male / Female anonymous avatar with candle
    return (
      <div className={`w-36 h-36 sm:w-44 sm:h-44 rounded-2xl border-2 border-[#c8a96e] shadow-[0_0_30px_rgba(200,169,110,0.5)] bg-gradient-to-b from-[#1c150c] via-black to-[#131a26] shrink-0 relative flex flex-col items-center justify-center p-3 select-none overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-amber-500/10 rounded-2xl blur-xl animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center justify-center space-y-1">
          {isFemale ? (
            <AnonymousFemaleAvatar className="w-16 h-16 sm:w-20 sm:h-20" />
          ) : (
            <AnonymousMaleAvatar className="w-16 h-16 sm:w-20 sm:h-20" />
          )}
          <div className="flex items-center space-x-1 space-x-reverse mt-1">
            <RealisticFlame size="small" isLit={true} showWax={true} />
            <span className="text-[10px] sm:text-xs uppercase font-serif tracking-widest text-[#c8a96e] font-bold text-center">
              {lang === 'he' ? 'נר נשמה' : lang === 'ru' ? 'Свеча памяти' : 'Yahrzeit Candle'}
            </span>
          </div>
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
        </div>
      );
    }

    // Default Placeholder when NO photo exists: Male / Female anonymous avatar with candle inside frame
    return (
      <div className={`w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-[#c8a96e] shadow-[0_0_25px_rgba(200,169,110,0.4)] bg-gradient-to-b from-[#1c150c] via-black to-[#131a26] shrink-0 relative flex flex-col items-center justify-center p-2 select-none overflow-hidden ${className}`}>
        <div className="absolute inset-0 bg-amber-500/10 rounded-2xl blur-lg animate-pulse"></div>
        <div className="relative z-10 flex flex-col items-center justify-center">
          {isFemale ? (
            <AnonymousFemaleAvatar className="w-12 h-12 sm:w-14 sm:h-14" />
          ) : (
            <AnonymousMaleAvatar className="w-12 h-12 sm:w-14 sm:h-14" />
          )}
          <div className="flex items-center space-x-1 space-x-reverse mt-1">
            <RealisticFlame size="small" isLit={true} showWax={true} />
            <span className="text-[10px] text-[#c8a96e] font-serif font-bold tracking-wider text-center">
              {lang === 'he' ? 'נר נשמה' : lang === 'ru' ? 'Свеча' : 'Candle'}
            </span>
          </div>
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
        </div>
      );
    }

    // Default Placeholder when NO photo exists: Male / Female anonymous avatar in circle with candle
    return (
      <div className={`w-14 h-14 rounded-full bg-gradient-to-b from-amber-950 via-black to-[#131a26] border-2 border-amber-400 flex flex-col items-center justify-center shrink-0 shadow-[0_0_15px_rgba(251,191,36,0.5)] group-hover:scale-105 transition-transform duration-300 overflow-hidden relative ${className}`}>
        <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-sm animate-pulse"></div>
        <div className="relative z-10 flex items-center justify-center">
          {isFemale ? (
            <AnonymousFemaleAvatar className="w-9 h-9" />
          ) : (
            <AnonymousMaleAvatar className="w-9 h-9" />
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 z-20 bg-black/90 border border-amber-400 p-0.5 rounded-full shadow-md flex items-center justify-center">
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
        </div>
      );
    }

    // Default Placeholder when NO photo exists: Male / Female anonymous avatar with candle
    return (
      <div className={`w-11 h-11 rounded-full bg-gradient-to-b from-amber-950 via-black to-[#131a26] border border-[#c8a96e]/60 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform duration-300 overflow-hidden relative ${className}`}>
        <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-xs animate-pulse"></div>
        <div className="relative z-10 flex items-center justify-center">
          {isFemale ? (
            <AnonymousFemaleAvatar className="w-7 h-7" />
          ) : (
            <AnonymousMaleAvatar className="w-7 h-7" />
          )}
        </div>
        <div className="absolute -bottom-1 -right-1 z-20 bg-black/90 border border-amber-400/80 p-0.5 rounded-full shadow flex items-center justify-center">
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
      </div>
    );
  }

  // Default Placeholder when NO photo exists: Male / Female anonymous avatar with candle
  return (
    <div className={`w-10 h-10 rounded-full border border-[#c8a96e]/40 bg-gradient-to-b from-amber-950 via-black to-[#131a26] flex items-center justify-center shrink-0 relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-amber-500/15 rounded-full blur-xs animate-pulse"></div>
      <div className="relative z-10 flex items-center justify-center">
        {isFemale ? (
          <AnonymousFemaleAvatar className="w-6 h-6" />
        ) : (
          <AnonymousMaleAvatar className="w-6 h-6" />
        )}
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 z-20 bg-black/90 border border-amber-400/80 p-0.5 rounded-full shadow flex items-center justify-center">
        <RealisticFlame size="small" isLit={true} showWax={true} />
      </div>
    </div>
  );
};
