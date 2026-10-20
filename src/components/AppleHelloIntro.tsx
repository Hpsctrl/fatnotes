import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import lottie, { type AnimationItem } from 'lottie-web';
import fishAnimationData from '../assets/fishAnimation.json';
import './AppleHelloIntro.css';

interface AppleHelloIntroProps {
  onComplete: () => void;
  duration?: number;
}

export const AppleHelloIntro: React.FC<AppleHelloIntroProps> = ({
  onComplete,
  duration,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const fishWrapperRef = useRef<HTMLDivElement>(null);
  const animationInstanceRef = useRef<AnimationItem | null>(null);

  // Detect mobile device (phone / touch screen or small viewport)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return window.innerWidth <= 768 || (isTouch && window.innerWidth <= 1024);
  });

  // Keep mobile state updated on resize
  useEffect(() => {
    const handleResize = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsMobile(window.innerWidth <= 768 || (isTouch && window.innerWidth <= 1024));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Lottie Animation
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      animationInstanceRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: fishAnimationData,
      });

      // Boost speed slightly for energetic, fluid fish swimming
      animationInstanceRef.current.setSpeed(1.15);
    } catch (err) {
      console.error('Failed to load fish lottie animation:', err);
    }

    return () => {
      animationInstanceRef.current?.destroy();
      animationInstanceRef.current = null;
    };
  }, []);

  // Handle intro duration & auto-dismiss:
  // On phone: strictly 2 seconds (2000ms) as requested.
  // On PC: 4500ms or custom duration to allow cursor follower interaction.
  useEffect(() => {
    const introDuration = isMobile ? 2000 : (duration ?? 4500);

    const timer = setTimeout(() => {
      onComplete();
    }, introDuration);

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
  }, [onComplete, duration, isMobile]);

  // Cursor Following Physics for PC & bounded idle swim for phone
  useEffect(() => {
    const wrapper = fishWrapperRef.current;
    if (!wrapper) return;

    let animId: number;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let currentAngle = 0;
    let time = 0;

    // PC: Track mouse coordinates
    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      targetX = e.clientX;
      targetY = e.clientY;
    };

    // Mobile: optional gentle touch follow, but clamped to screen
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        targetX = e.touches[0].clientX;
        targetY = e.touches[0].clientY;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Smooth render loop
    const tick = () => {
      time += 0.035;

      const halfFish = isMobile ? 85 : 120;
      const minX = halfFish + 16;
      const maxX = window.innerWidth - halfFish - 16;
      const minY = halfFish + 16;
      const maxY = window.innerHeight - halfFish - 16;

      if (isMobile) {
        // On phone: Keep strictly in screen center with subtle gentle swimming float
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const floatX = Math.sin(time * 1.5) * 18;
        const floatY = Math.cos(time * 2.1) * 14;

        currentX = Math.max(minX, Math.min(maxX, centerX + floatX));
        currentY = Math.max(minY, Math.min(maxY, centerY + floatY));
        currentAngle = Math.sin(time * 1.8) * 8; // subtle natural tilt
      } else {
        // PC: Smooth lerp towards cursor
        const lerpFactor = 0.085;
        currentX += (targetX - currentX) * lerpFactor;
        currentY += (targetY - currentY) * lerpFactor;

        // Keep fish safely within viewport bounds
        currentX = Math.max(minX, Math.min(maxX, currentX));
        currentY = Math.max(minY, Math.min(maxY, currentY));

        // Calculate heading angle towards cursor
        const dx = targetX - currentX;
        const dy = targetY - currentY;
        const dist = Math.hypot(dx, dy);

        if (dist > 4) {
          // Angle in degrees from horizontal
          const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
          // Smooth rotation (shortest angular distance)
          let diff = (angleDeg - currentAngle) % 360;
          if (diff < -180) diff += 360;
          if (diff > 180) diff -= 360;
          currentAngle += diff * 0.12;
        } else {
          // Gentle idle fin sway when stationary
          currentAngle += Math.sin(time * 2) * 0.4;
        }
      }

      // Apply transform directly to avoid React state re-render overhead at 60fps
      wrapper.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%) rotate(${currentAngle}deg)`;

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isMobile]);

  return (
    <motion.div
      className="fish-intro-overlay"
      onClick={onComplete}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Bioluminescent ambient oceanic backdrop */}
      <div className="fish-intro-ambient-glow" />
      <div className="fish-intro-radial-caustics" />

      {/* Floating interactive Fish follower wrapper */}
      <div
        ref={fishWrapperRef}
        className={`fish-follower-wrapper ${isMobile ? 'is-mobile' : 'is-pc'}`}
      >
        <div ref={containerRef} className="fish-lottie-container" />
        <div className="fish-trail-glow" />
      </div>

      {/* Modern minimalist overlay info */}
      <div className="fish-intro-footer">
        <div className="fish-intro-hint">
          {isMobile ? (
            <span>Notes Maker • Tap to start</span>
          ) : (
            <span>Move cursor to guide fish • Click anywhere to skip</span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
