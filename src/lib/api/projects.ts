// studio/src/lib/api/projects.ts

import { http } from './client';
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

export function fetchViewer(): Promise<ViewerIdentity> {
  return http.get<ViewerIdentity>('/auth/session');
}
