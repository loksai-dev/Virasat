import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop
 * 
 * Automatically resets page scroll to top on route navigation across the Virasat web application.
 * 
 * Key guarantees:
 * 1. Resets window and document scroll immediately upon pathname change (link click, sidebar, navbar, browser back/forward).
 * 2. Does NOT reset scroll position when only query parameters or search params change (e.g. switching tabs or filters).
 * 3. Handles anchor links (e.g. #product, #security) by scrolling to the target element once mounted.
 * 4. Disables browser's native automatic scroll restoration which causes middle-of-page landing in SPAs.
 * 5. Cleans up nested container scroll offsets if applicable.
 */
export const ScrollToTop: React.FC = () => {
  const location = useLocation();
  const prevPathnameRef = useRef<string>(location.pathname);

  // Disable native browser scroll restoration once on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const isNewRoute = prevPathnameRef.current !== location.pathname;
    prevPathnameRef.current = location.pathname;

    // Do not reset scroll if only query parameters or search params changed on the same page
    if (!isNewRoute && !location.hash) {
      return;
    }

    if (location.hash) {
      // If navigating to an in-page anchor, wait for DOM to mount then scroll to target
      const timeoutId = setTimeout(() => {
        const targetId = location.hash.replace('#', '');
        const targetElement = document.getElementById(targetId) || document.querySelector(location.hash);
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        } else {
          resetScroll();
        }
      }, 50);

      return () => clearTimeout(timeoutId);
    }

    // New route without hash: reset scroll to top immediately
    resetScroll();
  }, [location.pathname, location.hash]);

  return null;
};

/**
 * Helper to ensure window, body, html, and any main containers reset to top
 */
function resetScroll() {
  if (typeof window === 'undefined') return;

  try {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  } catch {
    window.scrollTo(0, 0);
  }

  if (document.documentElement) {
    document.documentElement.scrollTop = 0;
  }
  if (document.body) {
    document.body.scrollTop = 0;
  }

  // Also reset potential nested scrolling on main layout elements
  const mainElements = document.querySelectorAll('main');
  mainElements.forEach((el) => {
    el.scrollTop = 0;
  });

  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.scrollTop = 0;
  }
}

export default ScrollToTop;
