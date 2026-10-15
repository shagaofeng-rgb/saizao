"use client";

import { createContext, ReactNode, useContext } from "react";

type Role = "super_admin" | "admin" | "sales" | "content_editor" | "viewer" | null;
const AdminRoleContext = createContext<Role>(null);
export function AdminRoleProvider({ role, children }: { role: Role; children: ReactNode }) { return <AdminRoleContext.Provider value={role}>{children}</AdminRoleContext.Provider>; }
export function useAdminRole() { return useContext(AdminRoleContext); }
