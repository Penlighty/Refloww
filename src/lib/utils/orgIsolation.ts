/**
 * Returns the currently active organization ID.
 * Reads directly from localStorage to break circular store dependency loops in SSR.
 */
export function getActiveOrgId(): string {
    if (typeof window === 'undefined') return 'org-primary-default';
    try {
        const stored = localStorage.getItem('refloww_organizations_storage');
        if (stored) {
            const parsed = JSON.parse(stored);
            return parsed.state?.activeOrganizationId || 'org-primary-default';
        }
    } catch {
        // Fallback in case of parsing errors
    }
    return 'org-primary-default';
}

/**
 * Checks if an entity belongs to the active organization.
 * Un-tagged entities default strictly to 'org-primary-default'.
 */
export function belongsToActiveOrg(entityOrgId?: string, targetOrgId?: string): boolean {
    const active = targetOrgId || getActiveOrgId();
    const normalizedEntityOrg = entityOrgId || 'org-primary-default';
    return normalizedEntityOrg === active;
}

/**
 * Filters an array of entities strictly by the active organization ID.
 */
export function filterByActiveOrg<T extends { organizationId?: string }>(items: T[], targetOrgId?: string): T[] {
    const active = targetOrgId || getActiveOrgId();
    return items.filter(item => {
        const normalizedItemOrg = item.organizationId || 'org-primary-default';
        return normalizedItemOrg === active;
    });
}

