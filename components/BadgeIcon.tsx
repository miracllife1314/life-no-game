'use client';

import React from 'react';
import * as Icons from 'lucide-react';
import { Award } from 'lucide-react';

interface BadgeIconProps {
  name: string | null;
  unlocked?: boolean;
  size?: number;
  className?: string;
}

export function BadgeIcon({ name, unlocked = true, size = 48, className = '' }: BadgeIconProps) {
  if (name && (name.startsWith('http') || name.startsWith('data:image') || name.startsWith('data:'))) {
    return (
      <div 
        className={`relative flex items-center justify-center rounded-full border-2 bg-black shrink-0 transition-all ${className} ${
          unlocked 
            ? 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' 
            : 'border-zinc-800'
        }`}
        style={{ width: size, height: size }}
      >
        <img 
          src={name} 
          alt="Badge" 
          className={`w-[70%] h-[70%] object-contain rounded-full ${unlocked ? '' : 'grayscale opacity-30 contrast-75'}`} 
        />
      </div>
    );
  }

  const iconKey = name || 'Trophy';

  const strokeColor = unlocked ? '#fbbf24' : '#52525b';
  const innerStrokeColor = unlocked ? '#d97706' : '#3f3f46';
  const fillColor = unlocked ? '#0e0b06' : '#18181b';
  const iconColor = unlocked ? '#fef08a' : '#71717a';

  // Find the matching Lucide icon as the central emblem
  const LucideIcon = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[iconKey] || Award;

  // Custom frame geometries for 20 different badge designs
  // This ensures they all look unique, yet share the premium golden neon theme.
  const renderBadgeFrame = () => {
    switch (iconKey) {
      case 'Brain':
      case 'Eye':
      case 'Map': // Hexagon Shield
        return (
          <polygon 
            points="50,6 88,28 88,72 50,94 12,72 12,28" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth="3.5" 
            filter={unlocked ? 'url(#goldGlow)' : undefined}
          />
        );
      case 'Flame':
      case 'Star':
      case 'Wand':
      case 'Rocket': // Starburst Sun
        return (
          <path 
            d="M 50,5 L 60,20 L 76,12 L 72,28 L 90,30 L 78,44 L 92,56 L 75,60 L 80,78 L 64,74 L 58,90 L 50,76 L 42,90 L 36,74 L 20,78 L 25,60 L 8,56 L 22,44 L 10,30 L 28,28 L 24,12 L 40,20 Z" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth="3" 
            filter={unlocked ? 'url(#goldGlow)' : undefined}
          />
        );
      case 'Zap':
      case 'Music':
      case 'Globe': // Lightning / Wave Circle
        return (
          <g>
            <circle cx="50" cy="50" r="44" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <path d="M 15,50 L 85,50" stroke={innerStrokeColor} strokeWidth="1.5" strokeDasharray="3,3" />
          </g>
        );
      case 'Sparkles':
      case 'Lightbulb':
      case 'Award':
      case 'Unlock': // Cosmic Diamond Octagon
        return (
          <polygon 
            points="50,6 81,19 94,50 81,81 50,94 19,81 6,50 19,19" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth="3" 
            filter={unlocked ? 'url(#goldGlow)' : undefined}
          />
        );
      case 'BookOpen':
      case 'Gift': // Opened book / Gift Box
        return (
          <g>
            <rect x="10" y="14" width="80" height="72" rx="10" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <path d="M 50,14 L 50,86" stroke={innerStrokeColor} strokeWidth="2" />
          </g>
        );
      case 'Activity':
      case 'Clock': // Pulse Circle
        return (
          <g>
            <circle cx="50" cy="50" r="43" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <circle cx="50" cy="50" r="37" fill="none" stroke={innerStrokeColor} strokeWidth="1" strokeDasharray="4,2" />
          </g>
        );
      case 'UserPlus':
      case 'HelpCircle': // Keyhole frame
        return (
          <path 
            d="M 50,10 C 30,10 14,26 14,46 C 14,58 20,68 30,74 L 25,90 L 75,90 L 70,74 C 80,68 86,58 86,46 C 86,26 70,10 50,10 Z" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth="3.5" 
            filter={unlocked ? 'url(#goldGlow)' : undefined}
          />
        );
      case 'Users':
      case 'Anchor':
      case 'Mountain': // Overlapping Arch Shield
        return (
          <path 
            d="M 50,8 L 88,24 L 88,60 C 88,78 70,90 50,94 C 30,90 12,78 12,60 L 12,24 Z" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth="3.5" 
            filter={unlocked ? 'url(#goldGlow)' : undefined}
          />
        );
      case 'Heart':
      case 'Smile':
      case 'HeartHandshake': // Scalloped Winged Circle
        return (
          <g>
            <circle cx="50" cy="50" r="43" fill={fillColor} stroke={strokeColor} strokeWidth="3" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <path d="M 12,50 A 38,38 0 0,1 88,50" fill="none" stroke={innerStrokeColor} strokeWidth="1" />
          </g>
        );
      case 'MessageSquare':
      case 'Mail':
      case 'Video': // Rounded bubble / card
        return (
          <path 
            d="M 12,12 L 88,12 L 88,70 L 65,70 L 50,88 L 35,70 L 12,70 Z" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth="3.5" 
            filter={unlocked ? 'url(#goldGlow)' : undefined}
          />
        );
      case 'Compass':
      case 'Sun':
      case 'Moon': // Navigator Gear Circle
        return (
          <g>
            <circle cx="50" cy="50" r="44" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <path d="M 50,6 L 50,94 M 6,50 L 94,50 M 19,19 L 81,81 M 19,81 L 81,19" stroke={innerStrokeColor} strokeWidth="1" opacity="0.4" />
          </g>
        );
      case 'Share2':
      case 'Infinity': // Concentric Node Triangle
        return (
          <g>
            <polygon points="50,12 85,76 15,76" fill={fillColor} stroke={strokeColor} strokeWidth="3" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <circle cx="50" cy="50" r="28" fill="none" stroke={innerStrokeColor} strokeWidth="1" strokeDasharray="3,3" />
          </g>
        );
      case 'Trophy':
      case 'Sword':
      case 'Flag': // Royal Laurel Crest / Weapon Shield
        return (
          <g>
            <polygon points="50,6 90,32 74,86 26,86 10,32" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <path d="M 26,86 L 50,94 L 74,86" fill="none" stroke={strokeColor} strokeWidth="3.5" />
          </g>
        );
      case 'Crown': // Triple Peak Castle Frame
        return (
          <path 
            d="M 10,80 L 15,30 L 35,55 L 50,20 L 65,55 L 85,30 L 90,80 Z" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth="3.5" 
            filter={unlocked ? 'url(#goldGlow)' : undefined}
          />
        );
      case 'Gem': // Cut Diamond Hexagon
        return (
          <polygon 
            points="50,6 92,30 92,70 50,94 8,70 8,30" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth="3.5" 
            filter={unlocked ? 'url(#goldGlow)' : undefined}
          />
        );
      case 'Key': // Keyhole Gear Gate
        return (
          <g>
            <circle cx="50" cy="50" r="44" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <circle cx="50" cy="50" r="32" fill="none" stroke={innerStrokeColor} strokeWidth="1.5" />
          </g>
        );
      case 'Shield':
      case 'Lock': // Crusader Iron Shield
        return (
          <path 
            d="M 16,12 L 84,12 L 84,48 C 84,72 50,92 50,92 C 50,92 16,72 16,48 Z" 
            fill={fillColor} 
            stroke={strokeColor} 
            strokeWidth="3.5" 
            filter={unlocked ? 'url(#goldGlow)' : undefined}
          />
        );
      case 'Target':
      case 'Search':
      case 'CheckCircle': // Concentric Bullseye Rings
        return (
          <g>
            <circle cx="50" cy="50" r="44" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <circle cx="50" cy="50" r="30" fill="none" stroke={innerStrokeColor} strokeWidth="2" />
            <circle cx="50" cy="50" r="16" fill="none" stroke={innerStrokeColor} strokeWidth="1" />
          </g>
        );
      case 'Layers': // Quad-Layer Floating Deck
        return (
          <g>
            <rect x="16" y="16" width="68" height="68" rx="8" transform="rotate(45 50 50)" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
            <rect x="22" y="22" width="56" height="56" rx="6" transform="rotate(45 50 50)" fill="none" stroke={innerStrokeColor} strokeWidth="1" />
          </g>
        );
      case 'GraduationCap':
      case 'Tree':
      case 'Coffee':
      case 'Feather': // Scholastic Octagram
        return (
          <g>
            <polygon points="50,6 81,19 94,50 81,81 50,94 19,81 6,50 19,19" fill={fillColor} stroke={innerStrokeColor} strokeWidth="1.5" />
            <circle cx="50" cy="50" r="40" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
          </g>
        );
      default: // Elegant Circle default
        return (
          <circle cx="50" cy="50" r="43" fill={fillColor} stroke={strokeColor} strokeWidth="3.5" filter={unlocked ? 'url(#goldGlow)' : undefined} />
        );
    }
  };

  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`} 
      style={{ width: size, height: size }}
    >
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full overflow-visible"
      >
        <defs>
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f59e0b" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Outer dynamic border frame */}
        {renderBadgeFrame()}

        {/* Small gold accents inside the border */}
        {unlocked && (
          <circle cx="50" cy="12" r="2" fill="#fbbf24" />
        )}
      </svg>

      {/* Central Emblem Icon */}
      <div 
        className="absolute z-10 flex items-center justify-center pointer-events-none"
        style={{ 
          color: iconColor,
          filter: unlocked ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.7))' : 'none'
        }}
      >
        <LucideIcon size={size * 0.42} />
      </div>
    </div>
  );
}
