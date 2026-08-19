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
    writeBatch
} from 'firebase/firestore';
import { db } from './config';

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
    role: 'admin' | 'free' | 'pro' | 'premium' | 'enterprise';
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
 * Check if a user has admin role
 */
export const isUserAdmin = async (userId: string): Promise<boolean> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) return false;
        const data = userDoc.data();
        return data?.role === 'admin' || data?.isAdmin === true;
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
};

/**
 * Set user as admin
 */
export const setUserAsAdmin = async (userId: string, isAdmin: boolean): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), {
        role: isAdmin ? 'admin' : 'free',
        isAdmin: isAdmin
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
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(100))); // Limit for performance
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        let activeUsers30Days = 0;
        let totalDocuments = 0;
        let totalTemplates = 0;

        const countPromises = usersSnap.docs.map(async (userDoc) => {
            const userData = userDoc.data();

            // Check if user was active in last 30 days
            if (userData.lastLoginAt) {
                const lastLogin = typeof userData.lastLoginAt.toDate === 'function'
                    ? userData.lastLoginAt.toDate()
                    : new Date(userData.lastLoginAt);
                if (lastLogin > thirtyDaysAgo) {
                    activeUsers30Days++;
                }
            }

            // Get subcollection counts
            const [docsCount, templatesCount] = await Promise.all([
                getCountFromServer(collection(db, 'users', userDoc.id, 'documents')).then(s => s.data().count).catch(() => 0),
                getCountFromServer(collection(db, 'users', userDoc.id, 'templates')).then(s => s.data().count).catch(() => 0)
            ]);

            return { docsCount, templatesCount };
        });

        const results = await Promise.all(countPromises);
        results.forEach(r => {
            totalDocuments += r.docsCount;
            totalTemplates += r.templatesCount;
        });

        return { activeUsers30Days, totalDocuments, totalTemplates };
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
