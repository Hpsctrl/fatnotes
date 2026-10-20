import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import lottie, { type AnimationItem } from 'lottie-web';
import './AppleHelloIntro.css';

interface AppleHelloIntroProps {
  onComplete: () => void;
  duration?: number;
}

// ── Animation Configs (ported from YT Downloader Intro System) ────────────────
interface AnimConfig {
  id: string;
  name: string;
  path: string;
  aspect: 'aspect-square' | 'aspect-portrait' | 'aspect-bottom-peek';
  align?: 'align-bottom';
  bgColor: string;
  glow: string;
  filter: string;
  durationMs: number;
  speed?: number;
  loop: boolean;
  rendererSettings?: {
    preserveAspectRatio: string;
    progressiveLoad?: boolean;
  };
}

const INTRO_ANIMATIONS: AnimConfig[] = [
  {
    id: 'fish',
    name: 'Bioluminescent Fish',
    path: '/animations/fish.json',
    aspect: 'aspect-square',
    bgColor: '#050811',
    glow: 'radial-gradient(circle, rgba(56, 189, 248, 0.30) 0%, rgba(129, 140, 248, 0.14) 40%, transparent 70%)',
    filter: 'drop-shadow(0 0 28px rgba(56, 189, 248, 0.40)) drop-shadow(0 0 60px rgba(99, 102, 241, 0.20))',
    durationMs: 4500,
    loop: true,
  },
  {
    id: 'character_c',
    name: 'Character Run',
    path: '/animations/character_c.json',
    aspect: 'aspect-square',
    bgColor: '#eef2f7',
    glow: 'radial-gradient(circle, rgba(99, 102, 241, 0.22) 0%, rgba(147, 197, 253, 0.12) 45%, transparent 70%)',
    filter: 'drop-shadow(0 14px 28px rgba(15, 23, 42, 0.08))',
    durationMs: 3800,
    loop: true,
  },
  {
    id: 'cat_peek',
    name: 'Playful Cat',
    path: '/animations/cat_peek.json',
    aspect: 'aspect-square',
    bgColor: '#0b0f19',
    glow: 'radial-gradient(circle, rgba(75, 112, 235, 0.35) 0%, rgba(30, 58, 138, 0.14) 45%, transparent 75%)',
    filter: 'drop-shadow(0 0 24px rgba(75, 112, 235, 0.35))',
    durationMs: 3800,
    loop: true,
  },
  {
    id: 'appy_present',
    name: 'Appy Present',
    path: '/animations/appy_present.json',
    aspect: 'aspect-bottom-peek',
    align: 'align-bottom',
    rendererSettings: {
      preserveAspectRatio: 'xMidYMax slice',
      progressiveLoad: true,
    },
    bgColor: '#faf6ed',
    glow: 'radial-gradient(ellipse 100% 75% at 50% 100%, rgba(251, 191, 36, 0.45) 0%, rgba(245, 158, 11, 0.15) 50%, transparent 80%)',
    filter: 'drop-shadow(0 -8px 28px rgba(120, 53, 15, 0.14))',
    durationMs: 3600,
    speed: 2.8,
    loop: false,
  },
];

// Pick a random animation (avoid repeating the last one across mounts)
let _lastIntroIndex = -1;
// Simple fetch cache to avoid re-fetching on re-mounts
const _animCache = new Map<string, object>();

function pickRandomAnimation(): AnimConfig {
  let nextIndex = Math.floor(Math.random() * INTRO_ANIMATIONS.length);
  if (INTRO_ANIMATIONS.length > 1 && nextIndex === _lastIntroIndex) {
    nextIndex = (nextIndex + 1) % INTRO_ANIMATIONS.length;
  }
  _lastIntroIndex = nextIndex;
  return INTRO_ANIMATIONS[nextIndex];
}

export const AppleHelloIntro: React.FC<AppleHelloIntroProps> = ({
  onComplete,
  duration,
}) => {
  // Pick one animation config for this render; stable across re-renders
  const [animConfig] = useState<AnimConfig>(() => pickRandomAnimation());

  const lottieContainerRef = useRef<HTMLDivElement>(null);
  const fishWrapperRef = useRef<HTMLDivElement>(null);
  const animationInstanceRef = useRef<AnimationItem | null>(null);

  const isFishAnim = animConfig.id === 'fish';

  // Detect mobile
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return window.innerWidth <= 768 || (isTouch && window.innerWidth <= 1024);
  });

  useEffect(() => {
    const handleResize = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(window.innerWidth <= 768 || (isTouch && window.innerWidth <= 1024));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Lottie — fetch JSON and load (with cache)
  useEffect(() => {
    if (!lottieContainerRef.current) return;
    let destroyed = false;

    const loadAnim = async () => {
      try {
        let animData = _animCache.get(animConfig.id);
        if (!animData) {
          const res = await fetch(animConfig.path);
          if (res.ok) {
            animData = await res.json() as object;
            _animCache.set(animConfig.id, animData);
          }
        }
        if (destroyed || !lottieContainerRef.current) return;

        animationInstanceRef.current = lottie.loadAnimation({
          container: lottieContainerRef.current,
          renderer: 'svg',
          loop: animConfig.loop,
          autoplay: true,
          animationData: animData,
          rendererSettings: animConfig.rendererSettings ?? {
            preserveAspectRatio: 'xMidYMid meet',
            progressiveLoad: true,
          },
        });

        if (animConfig.speed) {
          animationInstanceRef.current.setSpeed(animConfig.speed);
        }
        // Fish gets a slight speed boost for energetic swimming
        if (isFishAnim) {
          animationInstanceRef.current.setSpeed(1.15);
        }
      } catch (err) {
        console.error('Failed to load intro animation:', err);
      }
    };

    loadAnim();

    return () => {
      destroyed = true;
      animationInstanceRef.current?.destroy();
      animationInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-dismiss + keyboard skip
  useEffect(() => {
    const introDuration = isMobile ? 2000 : (duration ?? animConfig.durationMs);
    const timer = setTimeout(onComplete, introDuration);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        onComplete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete, duration, isMobile, animConfig.durationMs]);

  // ── Fish cursor-following physics (only for fish animation) ──────────────────
  useEffect(() => {
    if (!isFishAnim) return;
    const wrapper = fishWrapperRef.current;
    if (!wrapper) return;

    let animId: number;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let currentAngle = 0;
    let time = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      targetX = e.clientX;
      targetY = e.clientY;
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches?.[0]) {
        targetX = e.touches[0].clientX;
        targetY = e.touches[0].clientY;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    const tick = () => {
      time += 0.035;
      const halfFish = isMobile ? 85 : 120;
      const minX = halfFish + 16;
      const maxX = window.innerWidth - halfFish - 16;
      const minY = halfFish + 16;
      const maxY = window.innerHeight - halfFish - 16;

      if (isMobile) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const floatX = Math.sin(time * 1.5) * 18;
        const floatY = Math.cos(time * 2.1) * 14;
        currentX = Math.max(minX, Math.min(maxX, centerX + floatX));
        currentY = Math.max(minY, Math.min(maxY, centerY + floatY));
        currentAngle = Math.sin(time * 1.8) * 8;
      } else {
        currentX += (targetX - currentX) * 0.085;
        currentY += (targetY - currentY) * 0.085;
        currentX = Math.max(minX, Math.min(maxX, currentX));
        currentY = Math.max(minY, Math.min(maxY, currentY));
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const dist = Math.hypot(dx, dy);
        if (dist > 4) {
          const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
          let diff = (angleDeg - currentAngle) % 360;
          if (diff < -180) diff += 360;
          if (diff > 180) diff -= 360;
          currentAngle += diff * 0.12;
        } else {
          currentAngle += Math.sin(time * 2) * 0.4;
        }
      }
      wrapper.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) rotate(${currentAngle}deg)`;
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isFishAnim, isMobile]);

  // ── Skip pill style (adapts to light vs dark background) ─────────────────────
  const isDarkBg = animConfig.bgColor === '#0b0f19' || animConfig.bgColor === '#050811';
  const pillStyle: React.CSSProperties = isDarkBg
    ? { background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)', border: '1px solid rgba(255,255,255,0.15)' }
    : { background: 'rgba(0,0,0,0.06)', color: 'rgba(15,23,42,0.78)', border: '1px solid rgba(0,0,0,0.08)' };

  const skipText = isMobile ? 'Tap anywhere to skip' : 'Click anywhere or press Esc to skip';

  return (
    <motion.div
      className={`lottie-intro-overlay${animConfig.align ? ` ${animConfig.align}` : ''}`}
      style={{ backgroundColor: animConfig.bgColor }}
      onClick={onComplete}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Ambient glow */}
      <div className="intro-backdrop-glow" style={{ background: animConfig.glow }} />

      {/* ── Fish animation: interactive absolute follower ── */}
      {isFishAnim ? (
        <div
          ref={fishWrapperRef}
          className={`fish-follower-wrapper ${isMobile ? 'is-mobile' : 'is-pc'}`}
        >
          <div ref={lottieContainerRef} className="fish-lottie-container" />
          <div className="fish-trail-glow" />
        </div>
      ) : (
        /* ── Other animations: centred / bottom-peek ── */
        <div
          className={`intro-lottie-container ${animConfig.aspect}`}
          style={{ filter: animConfig.filter }}
        >
          <div ref={lottieContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      )}

      {/* Skip hint pill */}
      <div
        className={`intro-skip-hint${animConfig.align === 'align-bottom' ? ' hint-top' : ''}`}
        style={pillStyle}
      >
        {skipText}
      </div>
    </motion.div>
  );
};
