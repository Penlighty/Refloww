import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole } from '@/lib/types';
import { useSettingsStore } from './settingsStore';
import { db } from '../firebase/config';
import { doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

export interface StaffMember {
    id: string;
    email: string;
    name?: string;
    role: UserRole;
    status: 'active' | 'pending';
    invitedAt: string;
    joinedAt?: string;
}

export interface Organization {
    id: string;
    name: string;
    ownerEmail: string;
    roleInOrg: UserRole;
    members: StaffMember[];
    createdAt: string;
}

export interface OrgInvitation {
    id: string;
    orgId: string;
    orgName: string;
    inviterEmail: string;
    inviterName?: string;
    inviteeEmail: string;
    role: UserRole;
    status: 'pending' | 'accepted' | 'declined';
    createdAt: string;
}

interface OrganizationState {
    organizations: Organization[];
    activeOrganizationId: string;
    pendingInvitations: OrgInvitation[];

    // Actions
    setActiveOrganization: (id: string) => void;
    inviteStaffMember: (email: string, role: UserRole) => void;
    removeStaffMember: (memberId: string) => void;
    updateStaffRole: (memberId: string, role: UserRole) => void;
    createOrganization: (name: string, ownerEmail?: string) => string;
    deleteOrganization: (orgId: string) => void;
    getActiveOrganization: () => Organization | undefined;
    setPendingInvitations: (invites: OrgInvitation[]) => void;
    acceptInvitation: (invite: OrgInvitation) => void;
    declineInvitation: (inviteId: string) => void;
}

const getInitialOrg = (): Organization[] => {
    const company = useSettingsStore.getState()?.company;
    const name = company?.name && company.name !== 'My Company' ? company.name : 'Primary Organization';
    const email = company?.email || 'owner@inflow.app';

    return [
        {
            id: 'org-primary-default',
            name,
            ownerEmail: email,
            roleInOrg: 'admin',
            createdAt: new Date().toISOString(),
            members: [
                {
                    id: 'mem-owner-1',
                    email,
                    name: 'Organization Owner',
                    role: 'admin',
                    status: 'active',
                    invitedAt: new Date().toISOString(),
                    joinedAt: new Date().toISOString()
                }
            ]
        }
    ];
};

export const useOrganizationStore = create<OrganizationState>()(
    persist(
        (set, get) => ({
            organizations: getInitialOrg(),
            activeOrganizationId: 'org-primary-default',
            pendingInvitations: [],

            getActiveOrganization: () => {
                const { organizations, activeOrganizationId } = get();
                return organizations.find(o => o.id === activeOrganizationId) || organizations[0];
            },

            setActiveOrganization: (id: string) => {
                const target = get().organizations.find(o => o.id === id);
                if (!target) return;

                set({ activeOrganizationId: id });

                // Sync active role and company name in settings store
                const settingsStore = useSettingsStore.getState();
                settingsStore.setStaffRole(target.roleInOrg);
                settingsStore.updateCompany({ name: target.name });
                settingsStore.syncSettingsForActiveOrg(id);
            },

            setPendingInvitations: (invites: OrgInvitation[]) => {
                set({ pendingInvitations: invites });
            },

            acceptInvitation: (invite: OrgInvitation) => {
                set((state) => {
                    const existingOrg = state.organizations.find(o => o.id === invite.orgId);
                    let updatedOrgs = [...state.organizations];

                    if (!existingOrg) {
                        const newJoinedOrg: Organization = {
                            id: invite.orgId,
                            name: invite.orgName,
                            ownerEmail: invite.inviterEmail,
                            roleInOrg: invite.role,
                            createdAt: new Date().toISOString(),
                            members: [
                                {
                                    id: `mem-${Date.now()}`,
                                    email: invite.inviteeEmail,
                                    name: invite.inviteeEmail.split('@')[0],
                                    role: invite.role,
                                    status: 'active',
                                    invitedAt: invite.createdAt,
                                    joinedAt: new Date().toISOString()
                                }
                            ]
                        };
                        updatedOrgs.push(newJoinedOrg);
                    } else {
                        updatedOrgs = updatedOrgs.map(org => {
                            if (org.id !== invite.orgId) return org;
                            return {
                                ...org,
                                roleInOrg: invite.role
                            };
                        });
                    }

                    const remainingInvites = state.pendingInvitations.filter(i => i.id !== invite.id);

                    return {
                        organizations: updatedOrgs,
                        activeOrganizationId: invite.orgId,
                        pendingInvitations: remainingInvites
                    };
                });

                // Sync active settings for accepted org
                const settingsStore = useSettingsStore.getState();
                settingsStore.setStaffRole(invite.role);
                settingsStore.updateCompany({ name: invite.orgName });
                settingsStore.syncSettingsForActiveOrg(invite.orgId);

                // FIREBASE SYNC (Async)
                try {
                    // Note: Ideally this is a Cloud Function or batch to ensure atomic updates.
                    // For now, we update the invitation status and write the member document.
                    setDoc(doc(db, 'user_invitations', invite.id), { status: 'accepted' }, { merge: true });
                    
                    const newMember = {
                        id: `mem-${Date.now()}`,
                        email: invite.inviteeEmail,
                        name: invite.inviteeEmail.split('@')[0],
                        role: invite.role,
                        status: 'active',
                        invitedAt: invite.createdAt,
                        joinedAt: new Date().toISOString()
                    };
                    setDoc(doc(db, 'organizations', invite.orgId, 'members', newMember.id), newMember);
                } catch (error) {
                    console.error('Failed to sync accepted invitation to Firestore:', error);
                }
            },

            declineInvitation: (inviteId: string) => {
                set((state) => ({
                    pendingInvitations: state.pendingInvitations.filter(i => i.id !== inviteId)
                }));
                // FIREBASE SYNC
                try {
                    setDoc(doc(db, 'user_invitations', inviteId), { status: 'declined' }, { merge: true });
                } catch (error) {
                    console.error('Failed to decline invitation in Firestore:', error);
                }
            },

            inviteStaffMember: (email: string, role: UserRole) => {
                const cleanEmail = email.trim().toLowerCase();
                if (!cleanEmail) return;

                set((state) => {
                    const activeId = state.activeOrganizationId;
                    const updatedOrgs = state.organizations.map((org) => {
                        if (org.id !== activeId) return org;

                        if (org.members.some(m => m.email.toLowerCase() === cleanEmail)) {
                            return org;
                        }

                        const newMember: StaffMember = {
                            id: `mem-${Date.now()}`,
                            email: cleanEmail,
                            name: cleanEmail.split('@')[0],
                            role,
                            status: 'pending',
                            invitedAt: new Date().toISOString()
                        };

                        // FIREBASE SYNC (Async)
                        try {
                            setDoc(doc(db, 'organizations', org.id, 'members', newMember.id), newMember);
                            
                            const invDocId = `inv-${Date.now()}`;
                            setDoc(doc(db, 'user_invitations', invDocId), {
                                id: invDocId,
                                orgId: org.id,
                                orgName: org.name,
                                inviterEmail: org.ownerEmail, // Assumes owner is inviter for simplicity
                                inviteeEmail: cleanEmail,
                                role,
                                status: 'pending',
                                createdAt: new Date().toISOString()
                            });
                        } catch (error) {
                            console.error('Failed to sync invite to Firestore', error);
                        }

                        return {
                            ...org,
                            members: [...org.members, newMember]
                        };
                    });

                    return { organizations: updatedOrgs };
                });
            },

            removeStaffMember: (memberId: string) => {
                set((state) => ({
                    organizations: state.organizations.map((org) => {
                        if (org.id !== state.activeOrganizationId) return org;
                        
                        // FIREBASE SYNC
                        try {
                            deleteDoc(doc(db, 'organizations', org.id, 'members', memberId));
                        } catch (error) {
                            console.error('Failed to delete member from Firestore', error);
                        }

                        return {
                            ...org,
                            members: org.members.filter(m => m.id !== memberId)
                        };
                    })
                }));
            },

            updateStaffRole: (memberId: string, role: UserRole) => {
                set((state) => ({
                    organizations: state.organizations.map((org) => {
                        if (org.id !== state.activeOrganizationId) return org;
                        return {
                            ...org,
                            members: org.members.map(m => m.id === memberId ? { ...m, role } : m)
                        };
                    })
                }));
            },

            createOrganization: (name: string, ownerEmail = 'owner@inflow.app') => {
                const newId = `org-${Date.now()}`;
                const newOrg: Organization = {
                    id: newId,
                    name: name.trim(),
                    ownerEmail,
                    roleInOrg: 'admin',
                    createdAt: new Date().toISOString(),
                    members: [
                        {
                            id: `mem-${Date.now()}`,
                            email: ownerEmail,
                            name: 'Owner',
                            role: 'admin',
                            status: 'active',
                            invitedAt: new Date().toISOString(),
                            joinedAt: new Date().toISOString()
                        }
                    ]
                };

                set((state) => ({
                    organizations: [...state.organizations, newOrg],
                    activeOrganizationId: newId
                }));

                const settingsStore = useSettingsStore.getState();
                settingsStore.setStaffRole('admin');
                settingsStore.updateCompany({ name: newOrg.name });
                settingsStore.syncSettingsForActiveOrg(newId);

                // FIREBASE SYNC (Async)
                try {
                    const orgRef = doc(db, 'organizations', newId);
                    setDoc(orgRef, {
                        name: newOrg.name,
                        ownerEmail: newOrg.ownerEmail,
                        createdAt: newOrg.createdAt
                    }).then(() => {
                        const batch = writeBatch(db);
                        newOrg.members.forEach(m => {
                            batch.set(doc(db, 'organizations', newId, 'members', m.id), m);
                        });
                        batch.commit();
                    });
                } catch (error) {
                    console.error('Failed to sync organization to Firestore:', error);
                }

                return newId;
            },

            deleteOrganization: (orgId: string) => {
                set((state) => {
                    const remainingOrgs = state.organizations.filter((o) => o.id !== orgId);
                    let nextOrgs = remainingOrgs;
                    let nextActiveId = state.activeOrganizationId;

                    if (nextOrgs.length === 0) {
                        nextOrgs = getInitialOrg();
                        nextActiveId = nextOrgs[0].id;
                    } else if (state.activeOrganizationId === orgId) {
                        nextActiveId = nextOrgs[0].id;
                    }

                    const targetOrg = nextOrgs.find((o) => o.id === nextActiveId) || nextOrgs[0];

                    // Sync active settings for remaining active organization
                    const settingsStore = useSettingsStore.getState();
                    if (targetOrg) {
                        settingsStore.setStaffRole(targetOrg.roleInOrg);
                        settingsStore.updateCompany({ name: targetOrg.name });
                        settingsStore.syncSettingsForActiveOrg(targetOrg.id);
                    }

                    // FIREBASE SYNC (Async)
                    try {
                        deleteDoc(doc(db, 'organizations', orgId));
                        // Note: actual deletion of the members subcollection in Firestore requires a Cloud Function or batch delete.
                    } catch (error) {
                        console.error('Failed to delete organization from Firestore:', error);
                    }

                    return {
                        organizations: nextOrgs,
                        activeOrganizationId: nextActiveId,
                    };
                });
            }
        }),
        {
            name: 'refloww_organizations_storage',
        }
    )
);

