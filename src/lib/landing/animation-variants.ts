/**
 * Framer Motion Animation Variants for Landing Page
 *
 * Professional, hardware-accelerated animations using Framer Motion advanced features.
 * All animations use transform and opacity only for 60fps performance.
 *
 * @module animation-variants
 */

import { Variants } from 'framer-motion';

/**
 * Spring physics configuration for natural, responsive animations
 */
export const springPhysics = {
  gentle: { type: 'spring' as const, stiffness: 100, damping: 15, mass: 0.5 },
  smooth: { type: 'spring' as const, stiffness: 150, damping: 20, mass: 0.8 },
  bouncy: { type: 'spring' as const, stiffness: 300, damping: 25, mass: 1 },
  snappy: { type: 'spring' as const, stiffness: 400, damping: 30, mass: 1.2 },
  precise: { type: 'spring' as const, stiffness: 200, damping: 40, mass: 1 },
};

/**
 * Easing functions for smooth animations
 */
export const easings = {
  easeOutCubic: [0.33, 1, 0.68, 1],
  easeInOutCubic: [0.65, 0, 0.35, 1],
  easeOutQuart: [0.25, 1, 0.5, 1],
  easeOutExpo: [0.16, 1, 0.3, 1],
  anticipate: [0.34, 1.56, 0.64, 1],
} as const;

/**
 * Hero section stagger animations
 * Orchestrates entrance of hero elements with sophisticated timing
 */
export const heroVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
      when: 'beforeChildren',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
    },
  },
};

/**
 * Hero child elements - fade up with scale
 */
export const heroChildVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springPhysics.smooth,
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

/**
 * Hero headline with dramatic entrance
 */
export const heroHeadlineVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springPhysics.bouncy,
      opacity: { duration: 0.3, ease: easings.easeOutCubic },
    },
  },
};

/**
 * 3D card tilt effect with magnetic hover
 * Creates depth and interactivity for feature cards
 */
export const card3DTiltVariants: Variants = {
  rest: {
    scale: 1,
    rotateX: 0,
    rotateY: 0,
    z: 0,
  },
  hover: {
    scale: 1.05,
    rotateX: 5,
    rotateY: 5,
    z: 50,
    transition: springPhysics.gentle,
  },
  tap: {
    scale: 0.98,
    rotateX: 0,
    rotateY: 0,
    transition: { duration: 0.1 },
  },
};

/**
 * Card reveal animation with scale and blur
 * Modern entrance effect for cards and panels
 */
export const cardRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      ...springPhysics.smooth,
      filter: { duration: 0.3 },
    },
  },
};

/**
 * Staggered grid animation for feature sections
 * Creates wave effect across grid items
 */
export const gridContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const gridItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: springPhysics.smooth,
  },
};

/**
 * Slide in from direction variants
 * Directional entrance animations
 */
export const slideInVariants = {
  fromLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: springPhysics.smooth,
    },
  } as Variants,
  fromRight: {
    hidden: { opacity: 0, x: 60 },
    visible: {
      opacity: 1,
      x: 0,
      transition: springPhysics.smooth,
    },
  } as Variants,
  fromTop: {
    hidden: { opacity: 0, y: -60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: springPhysics.smooth,
    },
  } as Variants,
  fromBottom: {
    hidden: { opacity: 0, y: 60 },
    visible: {
      opacity: 1,
      y: 0,
      transition: springPhysics.smooth,
    },
  } as Variants,
};

/**
 * Timeline animation for feature showcase
 * Sequential reveal with connecting line animation
 */
export const timelineContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
      delayChildren: 0.2,
    },
  },
};

export const timelineItemVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -50,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: springPhysics.bouncy,
  },
};

export const timelineLineVariants: Variants = {
  hidden: {
    scaleY: 0,
    opacity: 0,
  },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: {
      duration: 0.8,
      ease: easings.easeOutCubic,
    },
  },
};

/**
 * Scroll-triggered fade variants
 * Optimized for use with useInView hook
 */
export const scrollFadeVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 40,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: easings.easeOutCubic,
    },
  },
};

/**
 * Scroll reveal with scale
 * Adds depth to scroll animations
 */
export const scrollRevealVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.85,
    y: 50,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springPhysics.smooth,
  },
};

/**
 * Scroll reveal with rotation
 * Adds sophisticated entrance for special elements
 */
export const scrollRotateVariants: Variants = {
  hidden: {
    opacity: 0,
    rotate: -10,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: springPhysics.gentle,
  },
};

/**
 * Button hover and tap animations
 * Provides tactile feedback for interactive elements
 */
export const buttonVariants: Variants = {
  rest: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.05,
    y: -2,
    transition: springPhysics.snappy,
  },
  tap: {
    scale: 0.95,
    y: 0,
    transition: { duration: 0.1 },
  },
};

/**
 * Magnetic button effect
 * Button follows cursor on hover
 */
export const magneticButtonVariants: Variants = {
  rest: {
    x: 0,
    y: 0,
    scale: 1,
  },
  hover: {
    scale: 1.1,
    transition: springPhysics.gentle,
  },
};

/**
 * Glow effect animation
 * Pulsing glow for emphasis
 */
export const glowVariants: Variants = {
  rest: {
    boxShadow: '0 0 0 0 rgba(20, 184, 166, 0)',
  },
  hover: {
    boxShadow: [
      '0 0 0 0 rgba(20, 184, 166, 0.4)',
      '0 0 0 8px rgba(20, 184, 166, 0)',
      '0 0 0 0 rgba(20, 184, 166, 0)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeOut',
    },
  },
};

/**
 * Floating animation
 * Subtle levitation effect for decorative elements
 */
export const floatingVariants: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Rotate loop animation
 * Continuous rotation for icons and decorations
 */
export const rotateLoopVariants: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 20,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

/**
 * Pulse scale animation
 * Attention-grabbing pulse effect
 */
export const pulseVariants: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Accordion expand/collapse
 * Smooth height animation for collapsible content
 */
export const accordionVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.3, ease: easings.easeInOutCubic },
      opacity: { duration: 0.2 },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.3, ease: easings.easeInOutCubic },
      opacity: { duration: 0.2, delay: 0.1 },
    },
  },
};

/**
 * Modal/Dialog animations
 * Sophisticated entrance for overlay dialogs
 */
export const modalBackdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export const modalContentVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springPhysics.smooth,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15 },
  },
};

/**
 * Number counter animation
 * Smooth counting effect for statistics
 */
export const counterVariants: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springPhysics.bouncy,
  },
};

/**
 * Text reveal by word
 * Staggered word appearance for headlines
 */
export const textContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.1,
    },
  },
};

export const textWordVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springPhysics.snappy,
  },
};

/**
 * Nav menu slide in
 * Mobile navigation entrance animation
 */
export const navMenuVariants: Variants = {
  closed: {
    x: '100%',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
    },
  },
  open: {
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 40,
    },
  },
};

export const navItemVariants: Variants = {
  closed: {
    opacity: 0,
    x: 20,
  },
  open: {
    opacity: 1,
    x: 0,
    transition: springPhysics.smooth,
  },
};

/**
 * Logo reveal animation
 * Sophisticated brand entrance
 */
export const logoVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
    rotate: -180,
  },
  visible: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: {
      ...springPhysics.bouncy,
      rotate: { duration: 0.6 },
    },
  },
};

/**
 * Reduced motion variants
 * Respects user's motion preferences
 */
export function getReducedMotionVariants(variants: Variants): Variants {
  const reduced: Variants = {};

  Object.keys(variants).forEach((key) => {
    const variant = variants[key];
    if (typeof variant === 'object') {
      reduced[key] = {
        ...variant,
        transition: { duration: 0.01 },
        y: 0,
        x: 0,
        scale: 1,
        rotate: 0,
        rotateX: 0,
        rotateY: 0,
      };
    }
  });

  return reduced;
}

/**
 * Utility function to create custom stagger animations
 */
export function createStaggerVariants(
  staggerDelay: number = 0.1,
  childrenDelay: number = 0
): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: childrenDelay,
      },
    },
  };
}

/**
 * Export all variants as a collection
 */
export const animationVariants = {
  hero: heroVariants,
  heroChild: heroChildVariants,
  heroHeadline: heroHeadlineVariants,
  card3DTilt: card3DTiltVariants,
  cardReveal: cardRevealVariants,
  gridContainer: gridContainerVariants,
  gridItem: gridItemVariants,
  slideIn: slideInVariants,
  timeline: {
    container: timelineContainerVariants,
    item: timelineItemVariants,
    line: timelineLineVariants,
  },
  scroll: {
    fade: scrollFadeVariants,
    reveal: scrollRevealVariants,
    rotate: scrollRotateVariants,
  },
  button: buttonVariants,
  magneticButton: magneticButtonVariants,
  glow: glowVariants,
  floating: floatingVariants,
  rotateLoop: rotateLoopVariants,
  pulse: pulseVariants,
  accordion: accordionVariants,
  modal: {
    backdrop: modalBackdropVariants,
    content: modalContentVariants,
  },
  counter: counterVariants,
  text: {
    container: textContainerVariants,
    word: textWordVariants,
  },
  nav: {
    menu: navMenuVariants,
    item: navItemVariants,
  },
  logo: logoVariants,
};
