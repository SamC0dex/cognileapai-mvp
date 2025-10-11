/**
 * useScrollAnimation Hook
 *
 * Custom hook for triggering animations when elements enter the viewport.
 * Leverages Framer Motion's useInView for performance-optimized scroll detection.
 *
 * @module use-scroll-animation
 */

'use client';

import { useRef, useEffect } from 'react';
import { useInView, useAnimation, AnimationControls, AnimationDefinition } from 'framer-motion';

/**
 * Options for scroll animation behavior
 */
export interface UseScrollAnimationOptions {
  /**
   * Percentage of element that must be visible to trigger animation (0-1)
   * @default 0.1 (10% visible)
   */
  threshold?: number;

  /**
   * Margin around viewport for triggering animation early/late
   * @example "-100px" (trigger 100px before element enters viewport)
   * @example "100px" (trigger 100px after element enters viewport)
   * @default "0px"
   */
  rootMargin?: string;

  /**
   * Whether animation should only trigger once
   * @default true
   */
  once?: boolean;

  /**
   * Initial delay before animation starts (in seconds)
   * @default 0
   */
  delay?: number;

  /**
   * Whether to respect user's reduced motion preference
   * @default true
   */
  respectReducedMotion?: boolean;

  /**
   * Custom animation to trigger when element enters view
   * If not provided, you can use the controls manually
   */
  onEnterAnimation?: AnimationDefinition;

  /**
   * Custom animation to trigger when element exits view
   * Only used if once is false
   */
  onExitAnimation?: AnimationDefinition;
}

/**
 * Return type for useScrollAnimation hook
 */
export interface UseScrollAnimationReturn {
  /**
   * Ref to attach to the element you want to animate
   */
  ref: React.RefObject<HTMLElement | null>;

  /**
   * Whether the element is currently in view
   */
  isInView: boolean;

  /**
   * Animation controls for manual animation triggering
   */
  controls: AnimationControls;
}

/**
 * Hook for scroll-triggered animations
 *
 * @example
 * ```tsx
 * const { ref, isInView, controls } = useScrollAnimation({
 *   threshold: 0.2,
 *   once: true
 * });
 *
 * return (
 *   <motion.div
 *     ref={ref}
 *     animate={controls}
 *     initial={{ opacity: 0, y: 50 }}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useScrollAnimation(
  options: UseScrollAnimationOptions = {}
): UseScrollAnimationReturn {
  const {
    threshold = 0.1,
    rootMargin = '0px',
    once = true,
    delay = 0,
    respectReducedMotion = true,
    onEnterAnimation,
    onExitAnimation,
  } = options;

  const ref = useRef<HTMLElement>(null);
  const controls = useAnimation();

  // Check for reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  const shouldAnimate = !respectReducedMotion || !prefersReducedMotion;

  // Use Framer Motion's useInView for optimized scroll detection
  type InViewOptions = NonNullable<Parameters<typeof useInView>[1]>;
  const isInView = useInView(ref, {
    once,
    amount: threshold,
    margin: rootMargin as unknown as InViewOptions['margin'],
  });

  useEffect(() => {
    if (!shouldAnimate) {
      // If reduced motion is preferred, skip animations
      controls.start({ opacity: 1, y: 0, x: 0, scale: 1 });
      return;
    }

    if (isInView && onEnterAnimation) {
      // Trigger enter animation with optional delay
      const timer = setTimeout(() => {
        controls.start(onEnterAnimation);
      }, delay * 1000);

      return () => clearTimeout(timer);
    } else if (!isInView && !once && onExitAnimation) {
      // Trigger exit animation if element leaves view (only if once is false)
      controls.start(onExitAnimation);
    }
  }, [isInView, controls, onEnterAnimation, onExitAnimation, delay, once, shouldAnimate]);

  return {
    ref,
    isInView,
    controls,
  };
}

/**
 * Hook for sequential scroll animations
 * Animates multiple elements in sequence as they enter view
 *
 * @example
 * ```tsx
 * const items = useSequentialScrollAnimation(3, {
 *   threshold: 0.2,
 *   staggerDelay: 0.1
 * });
 *
 * return items.map((item, i) => (
 *   <motion.div
 *     key={i}
 *     ref={item.ref}
 *     animate={item.controls}
 *     initial={{ opacity: 0, y: 20 }}
 *   />
 * ));
 * ```
 */
export function useSequentialScrollAnimation(
  count: number,
  options: UseScrollAnimationOptions & { staggerDelay?: number } = {}
) {
  const { staggerDelay = 0.1, ...scrollOptions } = options;

  const items = Array.from({ length: count }, (_, i) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useScrollAnimation({
      ...scrollOptions,
      delay: (scrollOptions.delay || 0) + i * staggerDelay,
    });
  });

  return items;
}

/**
 * Hook for scroll progress tracking
 * Returns a value between 0-1 representing scroll progress through an element
 *
 * @example
 * ```tsx
 * const { ref, progress } = useScrollProgress();
 *
 * return (
 *   <motion.div
 *     ref={ref}
 *     style={{ opacity: progress }}
 *   >
 *     Fades in as you scroll
 *   </motion.div>
 * );
 * ```
 */
export function useScrollProgress() {
  const ref = useRef<HTMLElement>(null);
  const [progress, setProgress] = React.useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleScroll = () => {
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top;
      const elementHeight = rect.height;
      const windowHeight = window.innerHeight;

      // Calculate progress (0 when element enters bottom, 1 when it exits top)
      const scrollProgress = Math.max(
        0,
        Math.min(1, (windowHeight - elementTop) / (windowHeight + elementHeight))
      );

      setProgress(scrollProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { ref, progress };
}

/**
 * Hook for viewport-based animations with custom triggers
 * More flexible than useScrollAnimation for complex scenarios
 */
export function useViewportAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px', once = true } = options;

  const ref = useRef<HTMLElement>(null);
  type InViewOptions2 = NonNullable<Parameters<typeof useInView>[1]>;
  const isInView = useInView(ref, {
    once,
    amount: threshold,
    margin: rootMargin as unknown as InViewOptions2['margin'],
  });

  return {
    ref,
    isInView,
    variants: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
    initial: 'hidden' as const,
    animate: isInView ? 'visible' : 'hidden',
  };
}

/**
 * Hook for bi-directional scroll animations
 * Animates in when scrolling down, animates out when scrolling up
 */
export function useBidirectionalScrollAnimation(options: UseScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px' } = options;

  const ref = useRef<HTMLElement>(null);
  const [scrollDirection, setScrollDirection] = React.useState<'up' | 'down'>('down');
  const [lastScrollY, setLastScrollY] = React.useState(0);

  type InViewOptions3 = NonNullable<Parameters<typeof useInView>[1]>;
  const isInView = useInView(ref, {
    once: false,
    amount: threshold,
    margin: rootMargin as unknown as InViewOptions3['margin'],
  });

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollDirection(currentScrollY > lastScrollY ? 'down' : 'up');
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return {
    ref,
    isInView,
    scrollDirection,
    variants: {
      hidden: {
        opacity: 0,
        y: scrollDirection === 'down' ? 20 : -20,
      },
      visible: {
        opacity: 1,
        y: 0,
      },
    },
    initial: 'hidden' as const,
    animate: isInView ? 'visible' : 'hidden',
  };
}

// Re-export React for hooks that need it
import React from 'react';
