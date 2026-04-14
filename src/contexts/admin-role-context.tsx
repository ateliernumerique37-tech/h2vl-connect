'use client';

import { createContext, useContext } from 'react';

export type AdminRole = 'Administrateur' | 'Modérateur';

interface AdminRoleContextValue {
  role: AdminRole | null;
}

const AdminRoleContext = createContext<AdminRoleContextValue>({ role: null });

export const AdminRoleProvider = AdminRoleContext.Provider;

export function useAdminRole(): AdminRole | null {
  return useContext(AdminRoleContext).role;
}
