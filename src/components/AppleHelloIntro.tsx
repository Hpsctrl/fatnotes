import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import './AppleHelloIntro.css';

interface AppleHelloIntroProps {
  onComplete: () => void;
  duration?: number;
}

export const AppleHelloIntro: React.FC<AppleHelloIntroProps> = ({
  onComplete,
  duration = 2200,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    const handleKeyDown = () => {
      onComplete();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete, duration]);

  return (
    <motion.div
      className="apple-hello-overlay"
      onClick={onComplete}
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(10px)' }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="apple-hello-backdrop-glow" />

      <div className="apple-hello-container">
        <svg
          className="apple-hello-svg"
          viewBox="0 0 740 820"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stroke 1: Apple "hello" initial loop & tall downstem */}
          <path
            className="apple-hello-stroke apple-hello-loop"
            pathLength="1"
            d="M 30.9,662.2 C 141.9,600.5 243.1,521.2 357.9,386.1 C 436.0,293.9 478.0,188.6 480.0,116.0 C 481.0,62.0 454.7,21.0 406.0,21.0 C 352.0,21.0 318.0,62.0 297.0,156.0 C 274.0,259.3 257.0,377.9 214.0,758.2"
          />

          {/* Stroke 2: Apple "hello" retrace up into arch & graceful exit flourish */}
          <path
            className="apple-hello-stroke apple-hello-arch"
            pathLength="1"
            d="M 218.2,721.0 C 240.2,527.5 324.0,386.2 431.0,386.2 C 495.0,386.2 535.7,437.2 524.1,510.2 C 517.6,553.2 510.1,597.2 501.3,648.2 C 491.1,712.2 520.3,762.2 609.0,762.2 C 650.0,762.2 680.0,738.2 700.0,698.2"
          />
        </svg>
      </div>

      <div className="apple-hello-skip-hint">Click anywhere to skip</div>
    </motion.div>
  );
};
