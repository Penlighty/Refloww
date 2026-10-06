export * from './icons';
export { Icon } from './Icon';
export { iconRegistry, type IconName } from './registry';
export { createIcon, ICON_WEIGHT, type IconProps, type IconComponent } from './createIcon';
// Drop-in for `import type { LucideIcon } from 'lucide-react'`
export type { IconComponent as LucideIcon } from './createIcon';
