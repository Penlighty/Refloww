import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole } from '@/lib/types';
import { useSettingsStore } from './settingsStore';

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

interface OrganizationState {
    organizations: Organization[];
    activeOrganizationId: string;

    // Actions
    setActiveOrganization: (id: string) => void;
    inviteStaffMember: (email: string, role: UserRole) => void;
    removeStaffMember: (memberId: string) => void;
    updateStaffRole: (memberId: string, role: UserRole) => void;
    createOrganization: (name: string, ownerEmail?: string) => string;
    getActiveOrganization: () => Organization | undefined;
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

            inviteStaffMember: (email: string, role: UserRole) => {
                const cleanEmail = email.trim().toLowerCase();
                if (!cleanEmail) return;

                set((state) => {
                    const activeId = state.activeOrganizationId;
                    const updatedOrgs = state.organizations.map((org) => {
                        if (org.id !== activeId) return org;

                        // Check if already invited
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

                return newId;
            }
        }),
        {
            name: 'refloww_organizations_storage',
        }
    )
);
