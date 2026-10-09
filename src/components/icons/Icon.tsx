import { iconRegistry, type IconName } from './registry';
import type { IconProps } from './createIcon';

/** Resolve an icon from a string name, e.g. <Icon name="Invoice" className="w-4 h-4" /> */
export function Icon({ name, ...props }: { name: IconName | (string & {}) } & IconProps) {
    const Cmp = iconRegistry[name];
    return Cmp ? <Cmp {...props} /> : null;
}
