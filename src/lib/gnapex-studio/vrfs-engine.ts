// studio/src/lib/gnapex-studio/vrfs-engine.ts
//
// Virtual Route File System (VRFS) — maps workspace route catalogs to
// a hierarchical directory tree. Admin/back-office surfaces are filtered
// out; only site-user/public workflows are exposed.

import type { WorkspaceDocument, StudioManifest } from "../contract";

export type VRFSNodeType = "directory" | "page" | "layout" | "param";

export type SiteUserRole =
  | "public"
  | "auth"
  | "student"
  | "teacher"
  | "parent"
  | "donor"
  | "customer"
  | "general";

export interface VRFSNode {
  id: string;
  slug: string;
  label: string;
  type: VRFSNodeType;
  routePath: string;
  isDynamic: boolean;
  paramName?: string;
  required?: boolean;
  provisioned: boolean;
  componentCount: number;
  children: VRFSNode[];
  parentId: string | null;
  role: SiteUserRole;
  allowedCapabilities?: string[];
}

export interface VRFSRoot {
  workspaceMode: string;
  totalDirectories: number;
  totalPages: number;
  tree: VRFSNode[];
  nodeMap: Map<string, VRFSNode>;
}

const ADMIN_PREFIXES = [
  "admin",
  "system",
  "dashboard/admin",
  "platform",
  "settings",
  "billing",
  "users",
  "rbac",
  "audit",
  "super",
];

function isAdministrative(key: string): boolean {
  const lower = key.toLowerCase();
  return ADMIN_PREFIXES.some(
    (p) => lower === p || lower.startsWith(`${p}/`) || lower.includes(`.${p}`),
  );
}

function inferRole(segment: string): SiteUserRole {
  const s = segment.toLowerCase();
  if (
    s === "public" ||
    s === "home" ||
    s === "about" ||
    s === "admissions" ||
    s === "academics" ||
    s === "contact" ||
    s === "programmes" ||
    s === "shop"
  )
    return "public";
  if (
    s === "auth" ||
    s === "login" ||
    s === "forgot-password" ||
    s === "student-activate" ||
    s === "guardian-verify"
  )
    return "auth";
  if (s === "students" || s === "student") return "student";
  if (s === "teachers" || s === "teacher") return "teacher";
  if (s === "parents" || s === "parent") return "parent";
  if (s === "donors" || s === "donor") return "donor";
  if (s === "account" || s === "cart" || s === "checkout" || s === "shop")
    return "customer";
  return "general";
}

function humanizeSegment(segment: string): string {
  if (segment.startsWith("[") && segment.endsWith("]")) {
    const raw = segment.slice(1, -1);
    return `${raw.charAt(0).toUpperCase() + raw.slice(1)} (Dynamic)`;
  }
  return segment
    .split(/[-_.]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export interface CatalogEntry {
  key?: string;
  id?: string;
  label?: string;
  required?: boolean;
}

export function buildVRFS(
  manifest: StudioManifest,
  document: WorkspaceDocument | null,
): VRFSRoot {
  const nodeMap = new Map<string, VRFSNode>();
  const rootNodes: VRFSNode[] = [];
  const m = manifest as unknown as {
    pageCatalog?: unknown[];
    pages?: unknown[];
  };
  const rawCatalog = m.pageCatalog ?? m.pages ?? [];

  let dirCount = 0;
  let pageCount = 0;

  for (const raw of rawCatalog) {
    const item = typeof raw === "string" ? { key: raw } : (raw as CatalogEntry);
    const key = item.key ?? item.id;
    if (!key) continue;
    if (isAdministrative(key)) continue;

    const isRequired = typeof item === "object" && item.required === true;
    const explicitLabel = item.label;

    const normalized = key.replace(/\./g, "/");
    const segments = normalized.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    let currentPath = "";
    let parentNode: VRFSNode | null = null;

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const isLeaf = i === segments.length - 1;
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;

      let existingNode = nodeMap.get(currentPath);

      const layoutKey = normalized;
      const pageLayouts = document?.pageLayouts ?? {};
      const layoutInstances =
        (pageLayouts as Record<string, unknown>)[layoutKey] ??
        (pageLayouts as Record<string, unknown>)[currentPath] ??
        [];
      const instances = Array.isArray(layoutInstances) ? layoutInstances : [];
      const makeIndexPage = (folder: VRFSNode): VRFSNode => ({
        id: layoutKey,
        slug: "index",
        label: explicitLabel || "Index",
        type: "page",
        routePath: folder.routePath,
        isDynamic: false,
        required: isRequired,
        provisioned: instances.length > 0,
        componentCount: instances.length,
        children: [],
        parentId: folder.id,
        role: folder.role,
      });

      // A route that is both a page and a parent ("students" + "students/new")
      // becomes a folder that owns an `index` page, exactly like the reference tree.
      if (existingNode && existingNode.type === "page" && !isLeaf) {
        const old = { ...existingNode };
        existingNode.type = old.isDynamic ? "param" : "directory";
        existingNode.id = currentPath;
        existingNode.label = humanizeSegment(segment);
        existingNode.required = false;
        existingNode.provisioned = false;
        existingNode.componentCount = 0;
        existingNode.children = [
          {
            ...old,
            slug: "index",
            isDynamic: false,
            children: [],
            parentId: currentPath,
            label: "Index",
          },
        ];
        dirCount++;
      }

      if (existingNode && isLeaf && existingNode.type !== "page") {
        // the folder already exists; this key is its index page
        if (!existingNode.children.some((c) => c.id === layoutKey)) {
          existingNode.children.unshift(makeIndexPage(existingNode));
          pageCount++;
        }
        parentNode = existingNode;
        continue;
      }

      if (!existingNode) {
        const isDynamic = segment.startsWith("[") && segment.endsWith("]");
        const nodeType: VRFSNodeType = isLeaf
          ? "page"
          : isDynamic
            ? "param"
            : "directory";

        if (nodeType === "page") pageCount++;
        else dirCount++;

        existingNode = {
          id: isLeaf ? layoutKey : currentPath,
          slug: segment,
          label:
            isLeaf && explicitLabel ? explicitLabel : humanizeSegment(segment),
          type: nodeType,
          routePath: `/portal/${currentPath}`,
          isDynamic,
          paramName: isDynamic ? segment.slice(1, -1) : undefined,
          required: isLeaf ? isRequired : false,
          provisioned: instances.length > 0 && isLeaf,
          componentCount: isLeaf ? instances.length : 0,
          children: [],
          parentId: parentNode ? parentNode.id : null,
          role: inferRole(segment),
        };

        nodeMap.set(currentPath, existingNode);
        if (parentNode) parentNode.children.push(existingNode);
        else rootNodes.push(existingNode);
      }

      parentNode = existingNode;
    }
  }

  return {
    workspaceMode:
      (manifest as unknown as { workspaceMode?: string }).workspaceMode ??
      (document as unknown as { workspaceMode?: string }).workspaceMode ??
      "GENERAL",
    totalDirectories: dirCount,
    totalPages: pageCount,
    tree: rootNodes,
    nodeMap,
  };
}
