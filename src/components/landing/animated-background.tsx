"use client"

import { motion } from "framer-motion"
import { useEffect, useState, useMemo } from "react"
import { cn } from "@/lib/utils"

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
  const [isMounted, setIsMounted] = useState(false)

  // Generate particle positions only on client to avoid hydration mismatch
  const particles = useMemo(() => {
    if (!isMounted) return []
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      duration: 10 + Math.random() * 12,
      delay: Math.random() * 5,
      size: 1 + Math.random() * 1.5,
      colorVariant: Math.floor(Math.random() * 3),
      movementPattern: Math.floor(Math.random() * 4), // 0: float, 1: circular, 2: diagonal, 3: figure-8
      intensity: 50 + Math.random() * 100, // Movement range
    }))
  }, [isMounted])

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
      <div className="absolute inset-0">
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br from-white via-[#f4f1ff]/90 to-[#fff7ef]/90",
            "dark:hidden"
          )}
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, rgba(139, 92, 246, 0.18), transparent 55%)," +
              "radial-gradient(circle at 85% 30%, rgba(244, 114, 182, 0.16), transparent 52%)," +
              "radial-gradient(circle at 50% 85%, rgba(20, 184, 166, 0.18), transparent 60%)",
          }}
        />
        <div className="absolute inset-0 hidden bg-gradient-to-br from-[#020817] via-[#041023] to-[#010409] dark:block" />
      </div>

      {/* Primary gradient orb - Teal */}
      <motion.div
        className="absolute -top-[40%] left-[10%] h-[600px] w-[600px] rounded-full opacity-[0.55] blur-[120px] dark:opacity-30"
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
        className="absolute -right-[10%] top-[20%] h-[500px] w-[500px] rounded-full opacity-[0.45] blur-[110px] dark:opacity-25"
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
        className="absolute bottom-[10%] left-[40%] h-[400px] w-[400px] rounded-full opacity-[0.35] blur-[95px] dark:opacity-20"
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
        className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent dark:via-primary/5"
        style={{
          x: mousePosition.x,
          y: mousePosition.y,
        }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
      />

      {/* Animated grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.08] dark:opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "80px 80px",
        }}
      />

      {/* Floating particles */}
      {particles.map((particle) => {
        const colorClasses = [
          "bg-teal-500/60 dark:bg-teal-400/30 shadow-[0_0_12px_rgba(20,184,166,0.6)] dark:shadow-[0_0_10px_rgba(20,184,166,0.3)]",
          "bg-amber-500/60 dark:bg-amber-400/30 shadow-[0_0_12px_rgba(245,158,11,0.6)] dark:shadow-[0_0_10px_rgba(245,158,11,0.3)]",
          "bg-purple-500/60 dark:bg-purple-400/30 shadow-[0_0_12px_rgba(139,92,246,0.6)] dark:shadow-[0_0_10px_rgba(139,92,246,0.3)]",
        ]

        // Define different movement patterns
        const movements = [
          // Pattern 0: Organic floating
          {
            x: [0, particle.intensity * 0.3, -particle.intensity * 0.2, 0],
            y: [0, -particle.intensity, particle.intensity * 0.5, 0],
            rotate: [0, 180, 360],
            opacity: [0.4, 0.9, 0.5, 0.4],
            scale: [1, 1.6, 1.2, 1],
          },
          // Pattern 1: Circular orbit
          {
            x: [0, particle.intensity, 0, -particle.intensity, 0],
            y: [0, -particle.intensity * 0.5, -particle.intensity, -particle.intensity * 0.5, 0],
            rotate: [0, 90, 180, 270, 360],
            opacity: [0.4, 0.8, 0.9, 0.8, 0.4],
            scale: [1, 1.3, 1.6, 1.3, 1],
          },
          // Pattern 2: Diagonal drift
          {
            x: [0, -particle.intensity * 0.8, particle.intensity * 0.8, 0],
            y: [0, -particle.intensity * 1.2, -particle.intensity * 0.4, 0],
            rotate: [0, -90, 90, 0],
            opacity: [0.4, 0.7, 0.9, 0.4],
            scale: [1, 1.4, 1.7, 1],
          },
          // Pattern 3: Figure-8 infinity
          {
            x: [0, particle.intensity * 0.6, particle.intensity * 0.3, 0, -particle.intensity * 0.3, -particle.intensity * 0.6, 0],
            y: [0, -particle.intensity * 0.7, particle.intensity * 0.7, 0, -particle.intensity * 0.7, particle.intensity * 0.7, 0],
            rotate: [0, 60, 120, 180, 240, 300, 360],
            opacity: [0.4, 0.8, 0.6, 0.9, 0.6, 0.8, 0.4],
            scale: [1, 1.5, 1.2, 1.6, 1.2, 1.5, 1],
          },
        ]

        const movement = movements[particle.movementPattern]
        const easingFunctions = ["easeInOut", "linear", [0.43, 0.13, 0.23, 0.96], [0.22, 0.61, 0.36, 1]]

        return (
          <motion.div
            key={particle.id}
            className={cn("absolute rounded-full", colorClasses[particle.colorVariant])}
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              width: `${particle.size * 4}px`,
              height: `${particle.size * 4}px`,
            }}
            animate={movement}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              ease: easingFunctions[particle.movementPattern],
              delay: particle.delay,
            }}
          />
        )
      })}

      {/* Aurora effect at edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent dark:from-primary/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent dark:via-amber-500/5" />
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
