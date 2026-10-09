'use client';

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ComponentType,
    type ReactNode,
} from 'react';

/**
 * PageHeaderContext — lets each page tell the shared MobileHeader what to show.
 * Fixes the old design where <MobileHeader/> was mounted once in AppShell with no props, so `onSave`,
 * `onFilter`, `onMore`, `isSubmitting` and `title` could never be provided.
 *
 * Page:     usePageHeader({ title: 'New invoice', variant: 'creation', backHref: '/invoices',
 *                           actions: [{ id: 'save', label: 'Save', primary: true, loading: saving, onClick: save }] });
 * Header:   const cfg = usePageHeaderConfig();  → render cfg.actions, call callHeaderAction(id) on tap.
 *
 * Function handlers live in a ref (updated every render) so pages can pass inline closures without
 * causing re-render loops; only the serialisable parts (title, labels, flags) trigger header updates.
 */

export type HeaderVariant = 'dashboard' | 'section' | 'creation' | 'detail';

export interface HeaderAction {
    id: string;
    label: string;
    icon?: ComponentType<{ className?: string }>;
    primary?: boolean;
    disabled?: boolean;
    loading?: boolean;
    /** Show as icon-only button (label becomes aria-label). Default: primary actions show a label, others icon-only. */
    iconOnly?: boolean;
    onClick: () => void;
}

export interface PageHeaderConfig {
    title?: string;
    subtitle?: string;
    variant?: HeaderVariant;
    /** Fallback target for the back button when there is no in-app history. */
    backHref?: string;
    actions?: HeaderAction[];
}

type Serializable = Omit<PageHeaderConfig, 'actions'> & {
    actions?: Array<Omit<HeaderAction, 'onClick'>>;
};

interface Ctx {
    config: Serializable;
    set: (next: Serializable) => void;
    /** Replace the click handlers (latest closures). Owned by the provider so consumers never mutate a ref. */
    registerHandlers: (next: Record<string, () => void>) => void;
    run: (id: string) => void;
}

const PageHeaderCtx = createContext<Ctx | null>(null);

export function PageHeaderProvider({ children }: { children: ReactNode }) {
    const [config, setConfig] = useState<Serializable>({});
    const handlers = useRef<Record<string, () => void>>({});
    const value = useMemo<Ctx>(
        () => ({
            config,
            set: setConfig,
            registerHandlers: (next) => {
                handlers.current = next;
            },
            run: (id) => handlers.current[id]?.(),
        }),
        [config]
    );
    return <PageHeaderCtx.Provider value={value}>{children}</PageHeaderCtx.Provider>;
}

/** Call from a page/component. Clears itself on unmount. */
export function usePageHeader(config: PageHeaderConfig) {
    const ctx = useContext(PageHeaderCtx);
    const set = ctx?.set;
    const registerHandlers = ctx?.registerHandlers;
    const configRef = useRef(config);

    // Runs every render: keep the latest config + click closures without triggering header re-renders.
    useEffect(() => {
        configRef.current = config;
        registerHandlers?.(Object.fromEntries((config.actions ?? []).map((a) => [a.id, a.onClick])));
    });

    // Only changes in the serialisable parts push a new config to the header.
    const signature = JSON.stringify({
        title: config.title,
        subtitle: config.subtitle,
        variant: config.variant,
        backHref: config.backHref,
        actions: config.actions?.map((a) => [a.id, a.label, a.primary, a.disabled, a.loading, a.iconOnly]),
    });

    useEffect(() => {
        if (!set) return;
        const c = configRef.current;
        set({
            title: c.title,
            subtitle: c.subtitle,
            variant: c.variant,
            backHref: c.backHref,
            actions: c.actions?.map((a) => {
                const copy: Omit<HeaderAction, 'onClick'> & { onClick?: () => void } = { ...a };
                delete copy.onClick;
                return copy;
            }),
        });
        return () => set({});
    }, [signature, set]);
}

export function usePageHeaderConfig() {
    const ctx = useContext(PageHeaderCtx);
    return {
        config: ctx?.config ?? {},
        run: (id: string) => ctx?.run(id),
    };
}
