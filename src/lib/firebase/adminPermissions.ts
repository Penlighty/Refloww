/**
 * Admin Roles and Permissions Engine
 * Defines granular access controls for the Reflow Admin panel.
 */

// Define explicit administrative roles
export type AdminRole = 
    | 'super_admin'    // Full access to everything
    | 'support_admin'  // User management, org management, feedback, audit logs (read-only)
    | 'content_admin'  // Marketplace templates, announcements, feedback
    | 'user';          // Standard user (no admin access)

// Define fine-grained system permissions
export type AdminPermission = 
    | 'manage_users'
    | 'manage_orgs'
    | 'manage_marketplace'
    | 'manage_announcements'
    | 'manage_feedback'
    | 'manage_settings'
    | 'view_audit_logs'
    | 'assign_admin_roles';

// Role -> Permissions Mapping
const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
    super_admin: [
        'manage_users',
        'manage_orgs',
        'manage_marketplace',
        'manage_announcements',
        'manage_feedback',
        'manage_settings',
        'view_audit_logs',
        'assign_admin_roles'
    ],
    support_admin: [
        'manage_users',
        'manage_orgs',
        'manage_feedback',
        'view_audit_logs'
    ],
    content_admin: [
        'manage_marketplace',
        'manage_announcements',
        'manage_feedback'
    ],
    user: []
};

/**
 * Checks if a specific role possesses a target permission.
 */
export const hasPermission = (role: AdminRole | undefined, permission: AdminPermission): boolean => {
    if (!role || role === 'user') return false;
    
    // super_admin always has all permissions
    if (role === 'super_admin') return true;

    const allowedPermissions = ROLE_PERMISSIONS[role] || [];
    return allowedPermissions.includes(permission);
};

/**
 * Maps legacy boolean 'isAdmin' to a robust role if role is undefined.
 * Used for migrating legacy admin accounts.
 */
export const resolveAdminRole = (role: string | undefined, legacyIsAdmin: boolean | undefined): AdminRole => {
    if (role === 'super_admin' || role === 'support_admin' || role === 'content_admin') {
        return role as AdminRole;
    }
    
    // Legacy mapping: If they had isAdmin: true but no specific role, default them to super_admin 
    // to prevent breaking existing admin access. 
    if (role === 'admin' || legacyIsAdmin === true) {
        return 'super_admin';
    }

    return 'user';
};

/**
 * Helper to get a human-readable display name for an admin role.
 */
export const getRoleDisplayName = (role: AdminRole): string => {
    switch (role) {
        case 'super_admin': return 'Super Administrator';
        case 'support_admin': return 'Support Admin';
        case 'content_admin': return 'Content Admin';
        case 'user': return 'Standard User';
        default: return 'Unknown Role';
    }
};
