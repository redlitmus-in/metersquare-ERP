import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  variant?: 'dna-helix' | 'orbit-system' | 'infinity-loop' | 'pulse-wave' | 'cube-fold' | 'ripple-effect' | 'hourglass' | 'atom-spinner' | 'neon-glow' | 'mesh-gradient';
}

const ModernLoadingSpinners: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  variant = 'dna-helix'
}) => {
  const sizeValues = {
    sm: 40,
    md: 60,
    lg: 80,
    xl: 100,
  };

  const currentSize = sizeValues[size];

  // DNA Helix Spinner - Two intertwined strands
  const DNAHelixSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      <svg width={currentSize} height={currentSize} viewBox="0 0 100 100">
        {[...Array(8)].map((_, i) => (
          <motion.circle
            key={`left-${i}`}
            cx={35}
            cy={50}
            r="4"
            fill="#3b82f6"
            initial={{ y: -40 + i * 10 }}
            animate={{
              y: [-40 + i * 10, 40 - i * 10, -40 + i * 10],
              x: [0, 15, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <motion.circle
            key={`right-${i}`}
            cx={65}
            cy={50}
            r="4"
            fill="#ef4444"
            initial={{ y: 40 - i * 10 }}
            animate={{
              y: [40 - i * 10, -40 + i * 10, 40 - i * 10],
              x: [0, -15, 0],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>
    </div>
  );

  // Orbit System - Planets orbiting around a sun
  const OrbitSystemSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute w-3 h-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full shadow-lg shadow-orange-500/50" />
      </motion.div>
      
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <div 
          className="absolute rounded-full"
          style={{
            width: '4px',
            height: '4px',
            background: '#3b82f6',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 10px #3b82f6'
          }}
        />
      </motion.div>
      
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      >
        <div 
          className="absolute rounded-full"
          style={{
            width: '5px',
            height: '5px',
            background: '#ef4444',
            top: '30%',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 12px #ef4444'
          }}
        />
      </motion.div>
      
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -360 }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      >
        <div 
          className="absolute rounded-full"
          style={{
            width: '6px',
            height: '6px',
            background: '#10b981',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: '0 0 15px #10b981'
          }}
        />
      </motion.div>
    </div>
  );

  // Infinity Loop - Figure 8 motion
  const InfinityLoopSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      <svg width={currentSize} height={currentSize} viewBox="0 0 100 100">
        <motion.path
          d="M 25 50 Q 25 30, 50 50 T 75 50 Q 75 70, 50 50 T 25 50"
          fill="none"
          stroke="url(#infinityGradient)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <defs>
          <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        {[0, 0.33, 0.66].map((offset, i) => (
          <motion.circle
            key={i}
            r="3"
            fill={['#3b82f6', '#10b981', '#ef4444'][i]}
            initial={{ offsetDistance: `${offset * 100}%` }}
            animate={{
              offsetDistance: ['0%', '100%'],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: offset * 2
            }}
            style={{
              offsetPath: "path('M 25 50 Q 25 30, 50 50 T 75 50 Q 75 70, 50 50 T 25 50')",
            }}
          />
        ))}
      </svg>
    </div>
  );

  // Pulse Wave - Animated lines
  const PulseWaveSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      <div className="flex items-center justify-center h-full gap-1">
        <motion.div
          className="rounded"
          style={{
            width: '3px',
            height: currentSize * 0.5,
            backgroundColor: '#ef4444',
          }}
          animate={{
            scaleY: [0.5, 1, 0.5],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: 0,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="rounded"
          style={{
            width: '3px',
            height: currentSize * 0.5,
            backgroundColor: '#3b82f6',
          }}
          animate={{
            scaleY: [0.5, 1, 0.5],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: 0.2,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="rounded"
          style={{
            width: '3px',
            height: currentSize * 0.5,
            backgroundColor: '#10b981',
          }}
          animate={{
            scaleY: [0.5, 1, 0.5],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: 0.4,
            ease: "easeInOut"
          }}
        />
      </div>
    </div>
  );

  // Cube Fold - 3D cube folding animation
  const CubeFoldSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative"
          style={{ width: currentSize * 0.5, height: currentSize * 0.5 }}
          animate={{ rotateY: [0, 180, 360] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #10b981 100%)',
              transformStyle: 'preserve-3d',
            }}
            animate={{
              rotateX: [0, 90, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #3b82f6 100%)',
              transformStyle: 'preserve-3d',
            }}
            animate={{
              rotateY: [0, 90, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5
            }}
          />
        </motion.div>
      </div>
    </div>
  );

  // Ripple Effect - Expanding circles
  const RippleEffectSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{
            scale: [0, 2],
            opacity: [1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut"
          }}
        >
          <div 
            className="rounded-full border-2"
            style={{
              width: currentSize * 0.4,
              height: currentSize * 0.4,
              borderColor: ['#3b82f6', '#10b981', '#ef4444'][i],
            }}
          />
        </motion.div>
      ))}
    </div>
  );

  // Hourglass - Sand timer effect
  const HourglassSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      <motion.div
        className="relative w-full h-full"
        animate={{ rotate: [0, 180] }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <svg width={currentSize} height={currentSize} viewBox="0 0 100 100">
          <path
            d="M 30 20 L 30 35 L 50 50 L 70 35 L 70 20 Z M 30 80 L 30 65 L 50 50 L 70 65 L 70 80 Z"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
          <motion.path
            d="M 35 25 L 35 33 L 50 45 L 65 33 L 65 25 Z"
            fill="#10b981"
            animate={{
              d: [
                "M 35 25 L 35 33 L 50 45 L 65 33 L 65 25 Z",
                "M 45 35 L 45 37 L 50 40 L 55 37 L 55 35 Z",
                "M 50 50 L 50 50 L 50 50 L 50 50 L 50 50 Z",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.path
            d="M 50 50 L 50 50 L 50 50 L 50 50 L 50 50 Z"
            fill="#ef4444"
            animate={{
              d: [
                "M 50 50 L 50 50 L 50 50 L 50 50 L 50 50 Z",
                "M 45 65 L 45 63 L 50 60 L 55 63 L 55 65 Z",
                "M 35 75 L 35 67 L 50 55 L 65 67 L 65 75 Z",
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        </svg>
      </motion.div>
    </div>
  );

  // Atom Spinner - Electrons orbiting nucleus
  const AtomSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
      </div>
      
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateZ: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      >
        <svg width={currentSize} height={currentSize} viewBox="0 0 100 100">
          <ellipse
            cx="50"
            cy="50"
            rx="35"
            ry="10"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1"
            opacity="0.3"
          />
          <circle cx="85" cy="50" r="3" fill="#3b82f6" />
        </svg>
      </motion.div>
      
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateX: 60, rotateZ: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      >
        <svg width={currentSize} height={currentSize} viewBox="0 0 100 100">
          <ellipse
            cx="50"
            cy="50"
            rx="35"
            ry="10"
            fill="none"
            stroke="#10b981"
            strokeWidth="1"
            opacity="0.3"
          />
          <circle cx="85" cy="50" r="3" fill="#10b981" />
        </svg>
      </motion.div>
      
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateX: -60, rotateZ: -360 }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      >
        <svg width={currentSize} height={currentSize} viewBox="0 0 100 100">
          <ellipse
            cx="50"
            cy="50"
            rx="35"
            ry="10"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1"
            opacity="0.3"
          />
          <circle cx="85" cy="50" r="3" fill="#ef4444" />
        </svg>
      </motion.div>
    </div>
  );

  // Neon Glow - Glowing neon effect
  const NeonGlowSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      <svg width={currentSize} height={currentSize} viewBox="0 0 100 100">
        <defs>
          <filter id="neonGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <motion.circle
          cx="50"
          cy="50"
          r="20"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          filter="url(#neonGlow)"
          strokeDasharray="125.6"
          initial={{ strokeDashoffset: 125.6 }}
          animate={{
            strokeDashoffset: [125.6, 0, -125.6],
            stroke: ['#3b82f6', '#10b981', '#ef4444', '#3b82f6'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        
        <motion.circle
          cx="50"
          cy="50"
          r="15"
          fill="none"
          stroke="#10b981"
          strokeWidth="1"
          filter="url(#neonGlow)"
          opacity="0.5"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
    </div>
  );

  // Mesh Gradient - Morphing gradient mesh
  const MeshGradientSpinner = () => (
    <div className={`relative ${className}`} style={{ width: currentSize, height: currentSize }}>
      <svg width={currentSize} height={currentSize} viewBox="0 0 100 100">
        <defs>
          <linearGradient id="meshGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <motion.stop
              offset="0%"
              animate={{
                stopColor: ['#3b82f6', '#10b981', '#ef4444', '#3b82f6'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
            <motion.stop
              offset="100%"
              animate={{
                stopColor: ['#ef4444', '#3b82f6', '#10b981', '#ef4444'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </linearGradient>
        </defs>
        
        <motion.rect
          x="25"
          y="25"
          width="50"
          height="50"
          rx="10"
          fill="url(#meshGrad1)"
          animate={{
            rotate: [0, 90, 180, 270, 360],
            borderRadius: ['20%', '50%', '20%', '50%', '20%'],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.rect
          x="30"
          y="30"
          width="40"
          height="40"
          rx="8"
          fill="url(#meshGrad1)"
          opacity="0.5"
          animate={{
            rotate: [360, 270, 180, 90, 0],
            scale: [1, 0.8, 1, 0.8, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </svg>
    </div>
  );

  const spinnerComponents = {
    'dna-helix': <DNAHelixSpinner />,
    'orbit-system': <OrbitSystemSpinner />,
    'infinity-loop': <InfinityLoopSpinner />,
    'pulse-wave': <PulseWaveSpinner />,
    'cube-fold': <CubeFoldSpinner />,
    'ripple-effect': <RippleEffectSpinner />,
    'hourglass': <HourglassSpinner />,
    'atom-spinner': <AtomSpinner />,
    'neon-glow': <NeonGlowSpinner />,
    'mesh-gradient': <MeshGradientSpinner />,
  };

  return spinnerComponents[variant] || <DNAHelixSpinner />;
};

export default ModernLoadingSpinners;