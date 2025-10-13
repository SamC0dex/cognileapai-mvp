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
  const [isMounted, setIsMounted] = useState(false)

  // Generate particle positions only on client to avoid hydration mismatch
  const particles = useMemo(() => {
    if (!isMounted) return []
    
    // Create a more even distribution using a grid-based approach with randomness
    const gridSize = 6 // 6x6 grid for 32-36 particles
    const particlesList = []
    
    for (let i = 0; i < 32; i++) {
      // Calculate grid cell
      const row = Math.floor(i / gridSize)
      const col = i % gridSize
      
      // Base position in grid cell with substantial randomness
      const cellWidth = 100 / gridSize
      const cellHeight = 100 / gridSize
      const left = col * cellWidth + Math.random() * cellWidth
      const top = row * cellHeight + Math.random() * cellHeight
      
      particlesList.push({
        id: i,
        left: Math.max(5, Math.min(95, left)), // Keep away from edges
        top: Math.max(5, Math.min(95, top)),
        duration: 8 + Math.random() * 8, // Slower, gentler movements
        delay: Math.random() * 3,
        size: 1.2 + Math.random() * 1.8,
        colorVariant: Math.floor(Math.random() * 3),
        movementPattern: Math.floor(Math.random() * 4),
        intensity: 60 + Math.random() * 80, // Much gentler movement range
        twinkleSpeed: 2 + Math.random() * 3, // Slower twinkling
        twinkleDelay: Math.random() * 2,
        baseOpacity: 0.5 + Math.random() * 0.35,
        speedMultiplier: 0.8 + Math.random() * 0.4,
      })
    }
    
    return particlesList
  }, [isMounted])

  useEffect(() => {
    setIsMounted(true)
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

      {/* Floating particles with twinkling and mouse interaction */}
      {particles.map((particle) => {
        const colorClasses = [
          "bg-teal-400/80 dark:bg-teal-400/60 shadow-[0_0_20px_rgba(20,184,166,1),0_0_35px_rgba(20,184,166,0.6)] dark:shadow-[0_0_18px_rgba(20,184,166,0.9),0_0_30px_rgba(20,184,166,0.5)]",
          "bg-amber-400/80 dark:bg-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,1),0_0_35px_rgba(245,158,11,0.6)] dark:shadow-[0_0_18px_rgba(245,158,11,0.9),0_0_30px_rgba(245,158,11,0.5)]",
          "bg-purple-400/80 dark:bg-purple-400/60 shadow-[0_0_20px_rgba(139,92,246,1),0_0_35px_rgba(139,92,246,0.6)] dark:shadow-[0_0_18px_rgba(139,92,246,0.9),0_0_30px_rgba(139,92,246,0.5)]",
        ]

        // Define different movement patterns - gentle and soothing
        const baseMovements = [
          // Pattern 0: Gentle organic floating
          {
            x: [0, particle.intensity * 0.4, -particle.intensity * 0.3, particle.intensity * 0.2, 0],
            y: [0, -particle.intensity * 0.6, particle.intensity * 0.5, -particle.intensity * 0.3, 0],
            rotate: [0, 90, 180, 270, 360],
            scale: [1, 1.2, 1.1, 1.15, 1],
          },
          // Pattern 1: Smooth circular drift
          {
            x: [0, particle.intensity * 0.5, particle.intensity * 0.35, 0, -particle.intensity * 0.35, -particle.intensity * 0.5, 0],
            y: [0, -particle.intensity * 0.35, -particle.intensity * 0.5, -particle.intensity * 0.35, 0, -particle.intensity * 0.35, 0],
            rotate: [0, 60, 120, 180, 240, 300, 360],
            scale: [1, 1.15, 1.25, 1.2, 1.15, 1.1, 1],
          },
          // Pattern 2: Calm diagonal drift
          {
            x: [0, -particle.intensity * 0.45, particle.intensity * 0.5, -particle.intensity * 0.25, 0],
            y: [0, -particle.intensity * 0.6, particle.intensity * 0.55, -particle.intensity * 0.4, 0],
            rotate: [0, -90, 90, -45, 0],
            scale: [1, 1.2, 1.25, 1.15, 1],
          },
          // Pattern 3: Soft figure-8
          {
            x: [0, particle.intensity * 0.5, particle.intensity * 0.3, 0, -particle.intensity * 0.3, -particle.intensity * 0.5, -particle.intensity * 0.25, 0],
            y: [0, -particle.intensity * 0.5, particle.intensity * 0.5, 0, -particle.intensity * 0.5, particle.intensity * 0.5, -particle.intensity * 0.25, 0],
            rotate: [0, 45, 90, 135, 180, 225, 270, 360],
            scale: [1, 1.15, 1.1, 1.2, 1.15, 1.25, 1.2, 1],
          },
        ]
        
        const movement = baseMovements[particle.movementPattern]
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
              filter: 'blur(1px)',
            }}
            animate={{
              x: movement.x,
              y: movement.y,
              rotate: movement.rotate,
              scale: movement.scale,
              // Alive twinkling effect - more varied opacity with individual base
              opacity: [
                particle.baseOpacity * 0.6, 
                particle.baseOpacity * 1.2, 
                particle.baseOpacity * 0.8, 
                particle.baseOpacity * 1.3, 
                particle.baseOpacity * 0.7,
                particle.baseOpacity * 0.6
              ],
            }}
            transition={{
              x: {
                duration: particle.duration * particle.speedMultiplier,
                repeat: Infinity,
                ease: easingFunctions[particle.movementPattern],
                delay: particle.delay,
              },
              y: {
                duration: particle.duration * particle.speedMultiplier,
                repeat: Infinity,
                ease: easingFunctions[particle.movementPattern],
                delay: particle.delay,
              },
              rotate: {
                duration: particle.duration * particle.speedMultiplier,
                repeat: Infinity,
                ease: "linear",
                delay: particle.delay,
              },
              scale: {
                duration: particle.duration * particle.speedMultiplier,
                repeat: Infinity,
                ease: easingFunctions[particle.movementPattern],
                delay: particle.delay,
              },
              // Individual twinkle timing makes each particle feel alive and independent
              opacity: {
                duration: particle.twinkleSpeed,
                repeat: Infinity,
                ease: "easeInOut",
                delay: particle.twinkleDelay,
              },
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
