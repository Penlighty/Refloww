/**
 * Admin Firebase Service
 * Complete CRUD operations for Admin Panel
 */

import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    startAfter,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    where,
    getCountFromServer,
    serverTimestamp,
    onSnapshot,
    Timestamp,
    increment,
    writeBatch,
    collectionGroup
} from 'firebase/firestore';
import { db } from './config';
import { resolveAdminRole } from './adminPermissions';

// ============================================
// TYPES
// ============================================

export interface AdminStats {
    totalUsers: number;
    activeUsers30Days: number;
    totalDocuments: number;
    totalTemplates: number;
    pendingFeedback: number;
    marketplaceTemplates: number;
}

export interface UserSummary {
    id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    lastLogin?: string;
    createdAt?: string;
    role: 'admin' | 'free' | 'pro' | 'premium' | 'enterprise' | string;
    metadata?: {
        documentCount?: number;
        templateCount?: number;
        customerCount?: number;
        productCount?: number;
    };
    accountStatus: 'active' | 'inactive';
}

export interface Announcement {
    id: string;
    title: string;
    message: string;
    type: 'announcement' | 'promotion' | 'greeting' | 'warning';
    displayStyle?: 'banner' | 'popup' | 'notification' | 'modal';
    targetAudience?: 'all' | 'users' | 'guests';
    severity?: 'info' | 'success' | 'warning' | 'error';

    // Display Specific Options
    imageUrl?: string;
    modalSize?: 'sm' | 'md' | 'lg';
    expiresAt?: string;
    allowDismiss?: boolean;

    isActive: boolean;
    ctaLink?: string;
    ctaText?: string;
    createdAt: string;
    createdBy: string;
    views: number;
    clicks: number;
}

export interface Feedback {
    id: string;
    userId?: string;
    userEmail?: string;
    message: string;
    category?: 'bug' | 'feature' | 'general' | 'praise';
    sentiment?: 'positive' | 'neutral' | 'negative';
    status: 'new' | 'reviewed' | 'archived';
    createdAt: string;
    appVersion?: string;
    adminNotes?: string;
}

export interface MarketplaceTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    type: 'invoice' | 'receipt' | 'delivery-note';
    templateData: any; // Full template object
    thumbnail?: string;
    published: boolean;
    downloads: number;
    createdAt: string;
    createdBy: string;
    updatedAt?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatFirestoreDate = (dateVal: any): string | undefined => {
    if (!dateVal) return undefined;
    if (typeof dateVal.toDate === 'function') {
        return dateVal.toDate().toISOString();
    }
    if (dateVal instanceof Date) {
        return dateVal.toISOString();
    }
    if (typeof dateVal === 'string') {
        return dateVal;
    }
    return undefined;
};

/**
 * Check if a user has any admin access and return their specific role
 */
export const checkAdminAccess = async (userId: string): Promise<{ isAdmin: boolean, role: string }> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return { isAdmin: false, role: 'user' };
        
        const data = userDoc.data();
        const role = resolveAdminRole(data?.role, data?.isAdmin);
        
        return { isAdmin: role !== 'user', role };
    } catch (error) {
        console.error('Error checking admin status:', error);
        return { isAdmin: false, role: 'user' };
    }
};

/**
 * Set user as admin with specific role
 */
export const setUserAsAdmin = async (userId: string, role: string = 'super_admin'): Promise<void> => {
    const isAdminRole = role !== 'user' && role !== 'free' && role !== 'pro' && role !== 'premium' && role !== 'enterprise';
    
    await updateDoc(doc(db, 'users', userId), {
        role: role,
        isAdmin: isAdminRole, // Keep for backward compatibility
        updatedAt: serverTimestamp()
    });
};

// ============================================
// DASHBOARD STATS
// ============================================

export const getPlatformStats = async (): Promise<AdminStats> => {
    const [
        totalUsers,
        pendingFeedback,
        marketplaceTemplates,
        { activeUsers30Days, totalDocuments, totalTemplates }
    ] = await Promise.all([
        // Total users count
        getCountFromServer(collection(db, 'users')).then(s => s.data().count).catch(() => 0),

        // Pending feedback count
        getCountFromServer(query(collection(db, 'feedback'), where('status', '==', 'new')))
            .then(s => s.data().count).catch(() => 0),

        // Marketplace templates count
        getCountFromServer(query(collection(db, 'marketplace_templates'), where('published', '==', true)))
            .then(s => s.data().count).catch(() => 0),

        // Aggregate user stats (optimized - limit to recent users for performance)
        calculateUserAggregates()
    ]);

    return {
        totalUsers,
        activeUsers30Days,
        totalDocuments,
        totalTemplates,
        pendingFeedback,
        marketplaceTemplates
    };
};

async function calculateUserAggregates(): Promise<{ activeUsers30Days: number; totalDocuments: number; totalTemplates: number }> {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        const [activeUsersSnap, docsSnap, templatesSnap] = await Promise.all([
            // Active users in last 30 days
            getCountFromServer(query(collection(db, 'users'), where('lastLoginAt', '>', thirtyDaysAgo))).catch(() => ({ data: () => ({ count: 0 }) })),
            // Total documents across all users
            getCountFromServer(collectionGroup(db, 'documents')).catch(() => ({ data: () => ({ count: 0 }) })),
            // Total templates across all users
            getCountFromServer(collectionGroup(db, 'templates')).catch(() => ({ data: () => ({ count: 0 }) }))
        ]);

        return { 
            activeUsers30Days: activeUsersSnap.data().count, 
            totalDocuments: docsSnap.data().count, 
            totalTemplates: templatesSnap.data().count 
        };
    } catch (error) {
        console.error('Error calculating aggregates:', error);
        return { activeUsers30Days: 0, totalDocuments: 0, totalTemplates: 0 };
    }
}

// ============================================
// USER MANAGEMENT
// ============================================

export const getAllUsers = async (
    limitCount: number = 20,
    lastDoc: any = null
): Promise<{ users: UserSummary[], lastDoc: any, hasMore: boolean }> => {
    const usersColl = collection(db, 'users');

    let q = query(usersColl, orderBy('createdAt', 'desc'), limit(limitCount + 1)); // +1 to check if more exist
    if (lastDoc) {
        q = query(usersColl, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(limitCount + 1));
    }

    const snapshot = await getDocs(q);
    const hasMore = snapshot.docs.length > limitCount;
    const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

    const users: UserSummary[] = await Promise.all(docsToProcess.map(async (docSnap) => {
        const data = docSnap.data();

        // Get subcollection counts
        let docCount = 0;
        let templateCount = 0;
        try {
            const [docsSnap, templatesSnap] = await Promise.all([
                getCountFromServer(collection(db, 'users', docSnap.id, 'documents')),
                getCountFromServer(collection(db, 'users', docSnap.id, 'templates'))
            ]);
            docCount = docsSnap.data().count;
            templateCount = templatesSnap.data().count;
        } catch (e) {
            // Silently continue if counts fail
        }

        return {
            id: docSnap.id,
            email: data.email || 'No Email',
            displayName: data.displayName,
            photoURL: data.photoURL,
            lastLogin: formatFirestoreDate(data.lastLoginAt),
            createdAt: formatFirestoreDate(data.createdAt),
            role: data.role || 'user',
            metadata: {
                documentCount: docCount,
                templateCount: templateCount,
                customerCount: 0,
                productCount: 0
            },
            accountStatus: data.disabled ? 'inactive' : 'active'
        };
    }));

    return {
        users,
        lastDoc: docsToProcess[docsToProcess.length - 1] || null,
        hasMore
    };
};

export const getUserDetails = async (userId: string): Promise<UserSummary | null> => {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    const data = userDoc.data();
    return {
        id: userDoc.id,
        email: data.email || 'No Email',
        displayName: data.displayName,
        photoURL: data.photoURL,
        lastLogin: formatFirestoreDate(data.lastLoginAt),
        createdAt: formatFirestoreDate(data.createdAt),
        role: data.role || 'user',
        metadata: {
            documentCount: 0,
            templateCount: 0,
            customerCount: 0,
            productCount: 0
        },
        accountStatus: data.disabled ? 'inactive' : 'active'
    };
};

export const updateUserStatus = async (userId: string, disabled: boolean): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), {
        disabled,
        updatedAt: serverTimestamp()
    });
};

// ============================================
// ANNOUNCEMENTS (CRUD)
// ============================================

export const getAnnouncements = async (includeInactive = false): Promise<Announcement[]> => {
    const coll = collection(db, 'announcements');

    try {
        let q;
        if (!includeInactive) {
            q = query(coll, where('isActive', '==', true), orderBy('createdAt', 'desc'));
        } else {
            q = query(coll, orderBy('createdAt', 'desc'));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: formatFirestoreDate(doc.data().createdAt) || new Date().toISOString()
        })) as Announcement[];
    } catch (error: any) {
        // Fallback for missing index
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            console.warn('Announcements index not ready, using client-side filtering');
            const snapshot = await getDocs(coll);
            let results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: formatFirestoreDate(doc.data().createdAt) || new Date().toISOString()
            })) as Announcement[];

            if (!includeInactive) {
                results = results.filter(a => a.isActive);
            }
            results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return results;
        }
        throw error;
    }
};

export const getActiveAnnouncements = async (): Promise<Announcement[]> => {
    return getAnnouncements(false);
};

export const subscribeToActiveAnnouncements = (
    callback: (announcements: Announcement[]) => void
): () => void => {
    const coll = collection(db, 'announcements');

    // Try with composite index first
    const q = query(
        coll,
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const announcements = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: formatFirestoreDate(doc.data().createdAt) || new Date().toISOString()
        })) as Announcement[];
        callback(announcements);
    }, (error) => {
        // If index error, fall back to simpler query with client-side filtering
        if (error?.message?.includes('index')) {
            console.warn('Announcements index not ready, falling back to simple query');

            // Subscribe to all announcements and filter client-side
            const fallbackUnsubscribe = onSnapshot(coll, (snapshot) => {
                let announcements = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: formatFirestoreDate(doc.data().createdAt) || new Date().toISOString()
                })) as Announcement[];

                // Filter active and sort
                announcements = announcements.filter(a => a.isActive);
                announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                callback(announcements);
            }, (err) => {
                console.error('Error in fallback subscription:', err);
                callback([]);
            });

            // Return will clean up original failed subscription
        } else {
            console.error('Error subscribing to announcements:', error);
            callback([]);
        }
    });

    return unsubscribe;
};

export const createAnnouncement = async (
    announcement: Omit<Announcement, 'id' | 'createdAt' | 'views' | 'clicks'>
): Promise<string> => {
    const coll = collection(db, 'announcements');
    const docRef = doc(coll);
    await setDoc(docRef, {
        ...announcement,
        id: docRef.id,
        createdAt: serverTimestamp(),
        views: 0,
        clicks: 0
    });
    return docRef.id;
};

export const updateAnnouncement = async (
    id: string,
    updates: Partial<Omit<Announcement, 'id' | 'createdAt'>>
): Promise<void> => {
    await updateDoc(doc(db, 'announcements', id), {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'announcements', id));
};

export const toggleAnnouncementActive = async (id: string, isActive: boolean): Promise<void> => {
    await updateAnnouncement(id, { isActive });
};

export const incrementAnnouncementView = async (id: string): Promise<void> => {
    await updateDoc(doc(db, 'announcements', id), {
        views: increment(1)
    });
};

export const incrementAnnouncementClick = async (id: string): Promise<void> => {
    await updateDoc(doc(db, 'announcements', id), {
        clicks: increment(1)
    });
};

// ============================================
// FEEDBACK (CRUD)
// ============================================

export const getAllFeedback = async (
    statusFilter?: 'new' | 'reviewed' | 'archived'
): Promise<Feedback[]> => {
    const coll = collection(db, 'feedback');

    try {
        // Try with composite index first (requires index to be created)
        let q;
        if (statusFilter) {
            q = query(coll, where('status', '==', statusFilter), orderBy('createdAt', 'desc'), limit(100));
        } else {
            q = query(coll, orderBy('createdAt', 'desc'), limit(100));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: formatFirestoreDate(doc.data().createdAt) || new Date().toISOString()
        })) as Feedback[];
    } catch (error: any) {
        // If index doesn't exist, fall back to fetching all and filtering client-side
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            console.warn('Feedback index not ready, using client-side filtering');
            const snapshot = await getDocs(query(coll, limit(100)));
            let results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: formatFirestoreDate(doc.data().createdAt) || new Date().toISOString()
            })) as Feedback[];

            // Client-side filter and sort
            if (statusFilter) {
                results = results.filter(f => f.status === statusFilter);
            }
            results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return results;
        }
        throw error;
    }
};

export const getNewFeedback = async (): Promise<Feedback[]> => {
    return getAllFeedback('new');
};

export const createFeedback = async (
    feedback: Omit<Feedback, 'id' | 'createdAt' | 'status'>
): Promise<string> => {
    const coll = collection(db, 'feedback');
    const docRef = doc(coll);
    await setDoc(docRef, {
        ...feedback,
        id: docRef.id,
        status: 'new',
        createdAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateFeedbackStatus = async (
    id: string,
    status: 'new' | 'reviewed' | 'archived',
    adminNotes?: string
): Promise<void> => {
    const updates: any = { status, updatedAt: serverTimestamp() };
    if (adminNotes !== undefined) {
        updates.adminNotes = adminNotes;
    }
    await updateDoc(doc(db, 'feedback', id), updates);
};

export const deleteFeedback = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'feedback', id));
};

// ============================================
// MARKETPLACE TEMPLATES (CRUD)
// ============================================

export const getMarketplaceTemplates = async (
    publishedOnly = false
): Promise<MarketplaceTemplate[]> => {
    const coll = collection(db, 'marketplace_templates');

    try {
        let q;
        if (publishedOnly) {
            q = query(coll, where('published', '==', true), orderBy('createdAt', 'desc'));
        } else {
            q = query(coll, orderBy('createdAt', 'desc'));
        }

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: formatFirestoreDate(doc.data().createdAt) || new Date().toISOString(),
            updatedAt: formatFirestoreDate(doc.data().updatedAt)
        })) as MarketplaceTemplate[];
    } catch (error: any) {
        // Fallback for missing index
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            console.warn('Marketplace templates index not ready, using client-side filtering');
            const snapshot = await getDocs(coll);
            let results = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: formatFirestoreDate(doc.data().createdAt) || new Date().toISOString(),
                updatedAt: formatFirestoreDate(doc.data().updatedAt)
            })) as MarketplaceTemplate[];

            if (publishedOnly) {
                results = results.filter(t => t.published);
            }
            results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            return results;
        }
        throw error;
    }
};

export const getPublishedMarketplaceTemplates = async (): Promise<MarketplaceTemplate[]> => {
    return getMarketplaceTemplates(true);
};

export const getMarketplaceTemplate = async (id: string): Promise<MarketplaceTemplate | null> => {
    const docSnap = await getDoc(doc(db, 'marketplace_templates', id));
    if (!docSnap.exists()) return null;
    return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: formatFirestoreDate(docSnap.data().createdAt) || new Date().toISOString()
    } as MarketplaceTemplate;
};

export const createMarketplaceTemplate = async (
    template: Omit<MarketplaceTemplate, 'id' | 'createdAt' | 'downloads'>
): Promise<string> => {
    const coll = collection(db, 'marketplace_templates');
    const docRef = doc(coll);
    await setDoc(docRef, {
        ...template,
        id: docRef.id,
        createdAt: serverTimestamp(),
        downloads: 0
    });
    return docRef.id;
};

export const updateMarketplaceTemplate = async (
    id: string,
    updates: Partial<Omit<MarketplaceTemplate, 'id' | 'createdAt'>>
): Promise<void> => {
    await updateDoc(doc(db, 'marketplace_templates', id), {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const deleteMarketplaceTemplate = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'marketplace_templates', id));
};

export const toggleMarketplaceTemplatePublished = async (
    id: string,
    published: boolean
): Promise<void> => {
    await updateMarketplaceTemplate(id, { published });
};

export const incrementTemplateDownload = async (id: string): Promise<void> => {
    await updateDoc(doc(db, 'marketplace_templates', id), {
        downloads: increment(1)
    });
};

// ============================================
// ORGANIZATIONS (ADMIN VIEWS)
// ============================================

export interface OrganizationSummary {
    id: string;
    name: string;
    ownerId: string;
    tier: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'suspended';
    createdAt: string;
    memberCount: number;
}

export const getAllOrganizations = async (
    limitCount: number = 20,
    lastDoc: any = null
): Promise<{ organizations: OrganizationSummary[], lastDoc: any, hasMore: boolean }> => {
    const coll = collection(db, 'organizations');

    let q = query(coll, orderBy('createdAt', 'desc'), limit(limitCount + 1));
    if (lastDoc) {
        q = query(coll, orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(limitCount + 1));
    }

    let snapshot;
    try {
        snapshot = await getDocs(q);
    } catch (error: any) {
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            console.warn('Organizations index missing, falling back to unordered query.');
            const fallbackQ = lastDoc ? query(coll, startAfter(lastDoc), limit(limitCount + 1)) : query(coll, limit(limitCount + 1));
            snapshot = await getDocs(fallbackQ);
        } else {
            throw error;
        }
    }

    const hasMore = snapshot.docs.length > limitCount;
    const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

    const organizations: OrganizationSummary[] = await Promise.all(docsToProcess.map(async (docSnap) => {
        const data = docSnap.data();
        
        let memberCount = 0;
        try {
            const membersSnap = await getCountFromServer(collection(db, 'organizations', docSnap.id, 'members'));
            memberCount = membersSnap.data().count;
        } catch (e) {
            // Silently continue
        }

        return {
            id: docSnap.id,
            name: data.name || 'Unnamed Org',
            ownerId: data.ownerId,
            tier: data.tier || 'free',
            status: data.status || 'active',
            createdAt: formatFirestoreDate(data.createdAt) || new Date().toISOString(),
            memberCount
        };
    }));

    return {
        organizations,
        lastDoc: docsToProcess[docsToProcess.length - 1] || null,
        hasMore
    };
};

export const updateOrganizationStatus = async (orgId: string, status: 'active' | 'suspended', reason?: string): Promise<void> => {
    await updateDoc(doc(db, 'organizations', orgId), {
        status,
        statusReason: reason,
        updatedAt: serverTimestamp()
    });
};

export const updateOrganizationTier = async (orgId: string, tier: 'free' | 'pro' | 'enterprise'): Promise<void> => {
    await updateDoc(doc(db, 'organizations', orgId), {
        tier,
        updatedAt: serverTimestamp()
    });
};

// ============================================
// SYSTEM SETTINGS
// ============================================

export interface SystemSettings {
    maintenanceMode: boolean;
    maintenanceMessage?: string;
    allowSignups: boolean;
    features: {
        aiReceipts: boolean;
        marketplace: boolean;
        premiumTemplates: boolean;
    };
    updatedAt: string;
    updatedBy: string;
}

export const getSystemSettings = async (): Promise<SystemSettings> => {
    const docSnap = await getDoc(doc(db, 'system_settings', 'global'));
    
    // Default settings if none exist
    if (!docSnap.exists()) {
        return {
            maintenanceMode: false,
            allowSignups: true,
            features: {
                aiReceipts: true,
                marketplace: true,
                premiumTemplates: true
            },
            updatedAt: new Date().toISOString(),
            updatedBy: 'system'
        };
    }
    
    return {
        ...docSnap.data(),
        updatedAt: formatFirestoreDate(docSnap.data().updatedAt) || new Date().toISOString()
    } as SystemSettings;
};

export const updateSystemSettings = async (updates: Partial<SystemSettings>, adminId: string): Promise<void> => {
    await setDoc(doc(db, 'system_settings', 'global'), {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: adminId
    }, { merge: true });
};

// ============================================
// AUDIT LOGS
// ============================================

export interface AuditLogEntry {
    id: string;
    adminId: string;
    adminEmail?: string;
    action: string;
    resourceType: 'user' | 'organization' | 'settings' | 'marketplace' | 'announcement';
    resourceId?: string;
    details: any;
    timestamp: string;
}

export const logAdminAction = async (
    adminId: string,
    action: string,
    resourceType: AuditLogEntry['resourceType'],
    resourceId?: string,
    details?: any
): Promise<void> => {
    const coll = collection(db, 'audit_logs');
    
    // Try to get admin email for context
    let adminEmail = 'Unknown Admin';
    try {
        const adminDoc = await getDoc(doc(db, 'users', adminId));
        if (adminDoc.exists()) {
            adminEmail = adminDoc.data().email;
        }
    } catch (e) {
        // Silently continue
    }

    await setDoc(doc(coll), {
        adminId,
        adminEmail,
        action,
        resourceType,
        resourceId: resourceId || null,
        details: details || {},
        timestamp: serverTimestamp()
    });
};

export const getAuditLogs = async (
    limitCount: number = 50,
    lastDoc: any = null
): Promise<{ logs: AuditLogEntry[], lastDoc: any, hasMore: boolean }> => {
    const coll = collection(db, 'audit_logs');

    try {
        let q = query(coll, orderBy('timestamp', 'desc'), limit(limitCount + 1));
        if (lastDoc) {
            q = query(coll, orderBy('timestamp', 'desc'), startAfter(lastDoc), limit(limitCount + 1));
        }

        const snapshot = await getDocs(q);
        const hasMore = snapshot.docs.length > limitCount;
        const docsToProcess = hasMore ? snapshot.docs.slice(0, limitCount) : snapshot.docs;

        const logs = docsToProcess.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                timestamp: formatFirestoreDate(data.timestamp) || new Date().toISOString()
            } as AuditLogEntry;
        });

        return {
            logs,
            lastDoc: docsToProcess[docsToProcess.length - 1] || null,
            hasMore
        };
    } catch (error: any) {
        // Fallback for missing index
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
            console.warn('Audit logs index not ready, using client-side filtering');
            const snapshot = await getDocs(coll);
            let results = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    timestamp: formatFirestoreDate(data.timestamp) || new Date().toISOString()
                } as AuditLogEntry;
            });
            
            results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return { logs: results.slice(0, limitCount), lastDoc: null, hasMore: false };
        }
        throw error;
    }
};
