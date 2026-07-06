// =====================================================================
// 徽章圖示白名單:只 import 這 99 顆 lucide 圖示(picker 提供的 100 顆中,'Tree' 不存在
//   於 lucide-react → 省略,BadgeIcon 會 fallback 成 Award,與改版前逐字相同行為)。
//
// ⚠️ 為什麼要白名單:原本 BadgeIcon / OthersTab 用 `import * as Icons from 'lucide-react'`
//   會把 1500+ 顆圖示全部打進學員端 bundle。改成只帶這 <100 顆 → 大幅瘦身。
// ⚠️ 新增徽章圖示時:PRESET_BADGE_ICONS 與下方 named import + BADGE_ICON_MAP 要一起加,
//   否則 picker 選得到、但 BadgeIcon 會 fallback 成 Award。
// =====================================================================
import type { LucideIcon } from 'lucide-react';
import {
  Brain, Eye, Map, Flame, Star, Wand, Rocket, Zap,
  Music, Globe, Sparkles, Lightbulb, Award, Unlock, BookOpen, Gift,
  Activity, Clock, UserPlus, HelpCircle, Users, Anchor, Mountain, Heart,
  Smile, HeartHandshake, MessageSquare, Mail, Video, Compass, Sun, Moon,
  Share2, Infinity, Trophy, Sword, Flag, Crown, Gem, Key,
  Shield, Lock, Target, Search, CheckCircle, Layers, GraduationCap, Coffee,
  Feather, Sparkle, Briefcase, Laptop, Camera, TrendingUp, Coins, CheckSquare,
  MapPin, HeartPulse, UserCheck, SmilePlus, Glasses, Book, Library, Fingerprint,
  Timer, AlarmClock, Gamepad2, Dumbbell, Milestone, ShieldAlert, LockOpen, KeyRound,
  Hammer, Wrench, Cpu, Database, Terminal, Code2, Hash, Calculator,
  Bike, Navigation, Paperclip, Link, Send, Smartphone, Headphones, Mic,
  Cloud, CloudLightning, Wind, Sunrise, Sunset, Palette, Brush, PenTool,
  Scissors, Binoculars, Ghost,
} from 'lucide-react';

// picker 顯示用的名稱清單(含 'Tree',維持與改版前相同的可選項)。
export const PRESET_BADGE_ICONS: string[] = [
  'Brain', 'Eye', 'Map', 'Flame', 'Star', 'Wand', 'Rocket', 'Zap', 'Music', 'Globe',
  'Sparkles', 'Lightbulb', 'Award', 'Unlock', 'BookOpen', 'Gift', 'Activity', 'Clock', 'UserPlus', 'HelpCircle',
  'Users', 'Anchor', 'Mountain', 'Heart', 'Smile', 'HeartHandshake', 'MessageSquare', 'Mail', 'Video', 'Compass',
  'Sun', 'Moon', 'Share2', 'Infinity', 'Trophy', 'Sword', 'Flag', 'Crown', 'Gem', 'Key',
  'Shield', 'Lock', 'Target', 'Search', 'CheckCircle', 'Layers', 'GraduationCap', 'Tree', 'Coffee', 'Feather',
  'Sparkle', 'Briefcase', 'Laptop', 'Camera', 'TrendingUp', 'Coins', 'CheckSquare', 'MapPin', 'HeartPulse', 'UserCheck',
  'SmilePlus', 'Glasses', 'Book', 'Library', 'Fingerprint', 'Timer', 'AlarmClock', 'Gamepad2', 'Dumbbell', 'Milestone',
  'ShieldAlert', 'LockOpen', 'KeyRound', 'Hammer', 'Wrench', 'Cpu', 'Database', 'Terminal', 'Code2', 'Hash',
  'Calculator', 'Bike', 'Navigation', 'Paperclip', 'Link', 'Send', 'Smartphone', 'Headphones', 'Mic', 'Cloud',
  'CloudLightning', 'Wind', 'Sunrise', 'Sunset', 'Palette', 'Brush', 'PenTool', 'Scissors', 'Binoculars', 'Ghost',
];

// iconKey → 元件。BadgeIcon 以此查表,查無則 fallback Award。
export const BADGE_ICON_MAP: Record<string, LucideIcon> = {
  Brain, Eye, Map, Flame, Star, Wand, Rocket, Zap,
  Music, Globe, Sparkles, Lightbulb, Award, Unlock, BookOpen, Gift,
  Activity, Clock, UserPlus, HelpCircle, Users, Anchor, Mountain, Heart,
  Smile, HeartHandshake, MessageSquare, Mail, Video, Compass, Sun, Moon,
  Share2, Infinity, Trophy, Sword, Flag, Crown, Gem, Key,
  Shield, Lock, Target, Search, CheckCircle, Layers, GraduationCap, Coffee,
  Feather, Sparkle, Briefcase, Laptop, Camera, TrendingUp, Coins, CheckSquare,
  MapPin, HeartPulse, UserCheck, SmilePlus, Glasses, Book, Library, Fingerprint,
  Timer, AlarmClock, Gamepad2, Dumbbell, Milestone, ShieldAlert, LockOpen, KeyRound,
  Hammer, Wrench, Cpu, Database, Terminal, Code2, Hash, Calculator,
  Bike, Navigation, Paperclip, Link, Send, Smartphone, Headphones, Mic,
  Cloud, CloudLightning, Wind, Sunrise, Sunset, Palette, Brush, PenTool,
  Scissors, Binoculars, Ghost,
};
