"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

/**
 * Animated Background Component
 *
 * Creates an impressive animated mesh gradient background with:
 * - Flowing gradient orbs
 * - Subtle particle effects
 * - Dynamic color transitions
 * - Performance-optimized GPU animations
 */

export function AnimatedBackground() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Parallax effect based on mouse position
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Base gradient layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />

      {/* Primary gradient orb - Teal */}
      <motion.div
        className="absolute -top-[40%] left-[10%] h-[600px] w-[600px] rounded-full opacity-30 blur-[120px]"
        style={{
          background: "radial-gradient(circle, rgba(20, 184, 166, 0.4) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, 50, 0],
          y: [0, 30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary gradient orb - Amber */}
      <motion.div
        className="absolute -right-[10%] top-[20%] h-[500px] w-[500px] rounded-full opacity-25 blur-[100px]"
        style={{
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, -30, 0],
          y: [0, 50, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {/* Tertiary gradient orb - Purple accent */}
      <motion.div
        className="absolute bottom-[10%] left-[40%] h-[400px] w-[400px] rounded-full opacity-20 blur-[90px]"
        style={{
          background: "radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)",
        }}
        animate={{
          x: [0, 40, 0],
          y: [0, -40, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Mesh gradient overlay with parallax */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"
        style={{
          x: mousePosition.x,
          y: mousePosition.y,
        }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
      />

      {/* Animated grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Floating particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.5, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 3 + Math.random() * 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
          suppressHydrationWarning
        />
      ))}

      {/* Aurora effect at edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent" />
    </div>
  )
}

/**
 * Simplified animated background for sections (lighter version)
 */
export function SectionBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden opacity-50">
      {/* Subtle gradient orb */}
      <motion.div
        className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full opacity-30 blur-[80px]"
        style={{
          background: "radial-gradient(circle, rgba(20, 184, 166, 0.2) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}
