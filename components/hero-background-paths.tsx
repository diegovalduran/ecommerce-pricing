"use client"

import { motion } from "framer-motion"

function FloatingPaths({ position }: { position: number }) {
  const paths = Array.from({ length: 36 }, (_, i) => {
    // Smoother, multi-curve path
    const startY = 200 + i * 2 * position;
    const midY1 = 160 + i * 1.5 * position;
    const midY2 = 120 + i * 1.2 * position;
    const midY3 = 100 - i * 1.2 * position;
    const endY = 60 - i * 2 * position;
    return {
      id: i,
      d: `M0,${startY} C 120,${midY1} 240,${midY2} 348,${midY2} S 576,${midY3} 696,${endY}`,
      width: 0.5 + i * 0.03,
      delay: i * 0.15,
      initialX: -30 + i * 2 * position,
    }
  })

  return (
    <motion.svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 696 316"
      fill="none"
      initial={{ x: 0 }}
      animate={{ x: [0, 60 * position, -60 * position, 0] }}
      transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="flow1" x1="0" y1="0" x2="696" y2="316" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#a21caf" />
        </linearGradient>
      </defs>
      {paths.map((path, i) => (
        <motion.path
          key={path.id}
          d={path.d}
          stroke="url(#flow1)"
          strokeWidth={path.width}
          strokeOpacity={0.08 + i * 0.02}
          initial={{ pathLength: 0.7, opacity: 0.5, x: path.initialX }}
          animate={{ pathLength: 1, opacity: [0.3, 0.6, 0.3], x: [path.initialX, 60 * position, -60 * position, path.initialX] }}
          transition={{
            duration: 24,
            delay: path.delay,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.svg>
  )
}

export function HeroBackgroundPaths() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      <FloatingPaths position={1} />
      <FloatingPaths position={-1} />
    </div>
  )
} 