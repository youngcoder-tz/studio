// studio/src/lib/api/projects.ts

import { http, refreshSessionFromCookie } from './client';
import { isUnsignedIn } from '../errors';
import type { WorkspaceMode } from '../contract';

/**
 * The subset of a project the launcher needs.
 *
 * `GET /projects` returns the full Prisma record (with organisation and access
 * relations). Only these fields are read — the Studio deliberately does not
 * depend on the rest of the shape, so the backend can evolve it freely.
 */
export interface StudioProject {
  id: string;
  name: string;
  subdomain: string;
  workspaceMode: WorkspaceMode;
  status: string;
  organization?: { id: string; name: string } | null;
  teamAccess?: { role: string }[];
  updatedAt?: string;
}

export function fetchProjects(): Promise<StudioProject[]> {
  return http.get<StudioProject[]>('/projects');
}

/** The current dashboard identity, used to scope the launcher. */
export interface ViewerIdentity {
  user?: {
    id: string;
    email?: string;
    displayName?: string;
    firstName?: string;
    role?: string;
  };
  [key: string]: unknown;
}

/**
 * The current dashboard identity, used to scope the launcher.
 *
 * Order of precedence: a Studio bearer token already in this tab, then the
 * session cookies the dashboard wrote to the shared root domain, then — if that
 * access cookie has aged out — one silent trade of the refresh cookie for a new
 * token. Only when all three come back empty is anybody actually signed out.
 */
export async function fetchViewer(): Promise<ViewerIdentity> {
  try {
    return await http.get<ViewerIdentity>('/auth/session');
  } catch (error) {
    if (!isUnsignedIn(error)) throw error;
    if (!(await refreshSessionFromCookie())) throw error;
    return http.get<ViewerIdentity>('/auth/session');
  }
}
