import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageTransition
 * 
 * Smooth, subtle route transition wrapper using Framer Motion.
 * 
 * Guarantees:
 * 1. Gentle fade-in with a 10px vertical settling motion (8-12px requirement).
 * 2. Ultra-responsive 220ms duration (180-250ms requirement) with a smooth cubic easing.
 * 3. Prevents layout collisions: runs on entry without overlapping outgoing content.
 * 4. Full accessibility support: respects prefers-reduced-motion.
 * 5. Keyed on pathname so query param / filter changes do not trigger re-animation.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      key={location.pathname}
      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.15 : 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className || 'w-full flex-1 flex flex-col'}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
