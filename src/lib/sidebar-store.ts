import { create } from 'zustand';

interface SidebarState {
    isCollapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    toggleCollapsed: () => void;
    isMobileOpen: boolean;
    setMobileOpen: (open: boolean) => void;
    toggleMobile: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
    isCollapsed: false,
    setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
    toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
    isMobileOpen: false,
    setMobileOpen: (open) => set({ isMobileOpen: open }),
    toggleMobile: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
}));
