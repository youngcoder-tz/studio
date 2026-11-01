// studio/src/lib/gnapex-studio/visual-ir.ts
//
// THE VISUAL IR — DERIVATION & APPLICATION DIRECTORY.
//
// Workspace Mode does NOT build generic CMS pages (Home, About Us, Blog) —
// those belong to the website developer via Content Engine.
// Instead, Workspace Mode dynamically injects managed operational ERP surfaces
// (Auth, Portals, Public ERP Utilities like Live Bus Tracking & Result Verification).
//
// This module maps the authoritative backend catalog into clean, structured
// areas for the Studio client:
//
//   Workspace Design (Global Tokens & Theme)
//   Authentication (Login, Forgot Password, Reset Password)
//   Public ERP Utilities (Van Tracking, Result Verification, Admissions Apply)
//   Student Portal (Dashboard, Results, Fees, Timetable, Attendance)
//   Parent Portal (Family Dashboard)
//   Staff Portal (Teachers & Administration)

import type {
  LayoutInstance,
  ManifestField,
  PageDefinition,
  StudioManifest,
  WorkspaceDocument,
  WorkspaceMode,
} from "../contract";
import {
  classifyField,
  type DirectoryArea,
  type DirectoryEntry,
  type DirectoryGroup,
  type IRNode,
  type IRNodeGroup,
  type PageIR,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// PAGE CATALOG NORMALIZATION
// ─────────────────────────────────────────────────────────────────────────────

function humanizeKey(key: string): string {
  return key
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizePageCatalog(catalog: unknown): PageDefinition[] {
  if (!Array.isArray(catalog)) return [];
  const out: PageDefinition[] = [];
  for (const raw of catalog) {
    if (typeof raw === "string") {
      out.push({ key: raw, label: humanizeKey(raw), required: false });
      continue;
    }
    if (raw && typeof raw === "object") {
      const page = raw as Partial<PageDefinition> & Record<string, unknown>;
      if (typeof page.key !== "string") continue;
      out.push({
        key: page.key,
        label:
          typeof page.label === "string" ? page.label : humanizeKey(page.key),
        surface: page.surface,
        required: page.required === true,
        defaultPath:
          typeof page.defaultPath === "string" ? page.defaultPath : undefined,
      });
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// DIRECTORY (MANAGED INJECTED SURFACES BY MODE)
// ─────────────────────────────────────────────────────────────────────────────

export const MODE_OS_NAMES: Record<WorkspaceMode, string> = {
  EDUCATION: "EduOS",
  NON_PROFIT: "NGO OS",
  E_COMMERCE: "Commerce OS",
  GENERAL: "General OS",
  PARTNER: "Partner OS",
};

const AREA_RULES: Record<
  WorkspaceMode,
  { label: string; match: (key: string, page: PageDefinition) => boolean }[]
> = {
  EDUCATION: [
    {
      label: "Authentication",
      match: (k, p) =>
        p.surface === "AUTH" ||
        k.startsWith("auth-") ||
        k.includes("login") ||
        k.includes("password"),
    },
    {
      label: "Public ERP Utilities",
      match: (k, p) =>
        p.surface === "PUBLIC_UTILITY" ||
        k.startsWith("public-") ||
        k.includes("bus") ||
        k.includes("verify") ||
        k.includes("admissions-apply"),
    },
    {
      label: "Student Portal",
      match: (k) => k.startsWith("portal-student-") || k.includes("student"),
    },
    {
      label: "Parent Portal",
      match: (k) => k.startsWith("portal-parent-") || k.includes("parent"),
    },
    {
      label: "Staff & Administration",
      match: (k) =>
        k.startsWith("portal-staff-") ||
        k.includes("staff") ||
        k.includes("admin"),
    },
    {
      label: "Managed Application Surfaces",
      match: () => true,
    },
  ],

  NON_PROFIT: [
    {
      label: "Public Giving Utilities",
      match: (k, p) =>
        p.surface === "PUBLIC_UTILITY" ||
        k.startsWith("public-") ||
        k.includes("donate") ||
        k.includes("campaign") ||
        k.includes("donor-wall"),
    },
    {
      label: "Contributor & Donor Portals",
      match: (k) =>
        k.startsWith("portal-") ||
        k.includes("giving") ||
        k.includes("volunteer"),
    },
    {
      label: "Managed Application Surfaces",
      match: () => true,
    },
  ],

  E_COMMERCE: [
    {
      label: "Storefront Utilities",
      match: (k, p) =>
        p.surface === "PUBLIC_UTILITY" ||
        k === "checkout" ||
        k.includes("cart"),
    },
    {
      label: "Customer Portals",
      match: (k) => k.startsWith("portal-") || k.includes("order"),
    },
    {
      label: "Managed Application Surfaces",
      match: () => true,
    },
  ],

  GENERAL: [
    {
      label: "Client Portals",
      match: (k) => k.startsWith("portal-") || k.includes("client"),
    },
    {
      label: "Managed Application Surfaces",
      match: () => true,
    },
  ],

  PARTNER: [
    {
      label: "Partner Portals",
      match: (k) => k.startsWith("portal-") || k.includes("partner"),
    },
    {
      label: "Managed Application Surfaces",
      match: () => true,
    },
  ],
};

/**
 * Builds the application directory tree for the Studio left rail.
 */
export function buildDirectory(
  manifest: StudioManifest,
  document: WorkspaceDocument,
): DirectoryGroup[] {
  const pages = normalizePageCatalog(manifest?.pageCatalog ?? []);
  const workspaceArea: DirectoryArea = {
    key: "gnapex.design",
    label: "Workspace Design",
    design: true,
  };

  const groups: DirectoryGroup[] = [{ area: workspaceArea, entries: [] }];

  const rules = AREA_RULES[manifest.workspaceMode] ?? AREA_RULES.GENERAL;
  const areaByKey = new Map<string, DirectoryArea>();

  for (const rule of rules) {
    const area: DirectoryArea = {
      key: `area:${rule.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      label: rule.label,
    };
    groups.push({ area, entries: [] });
    for (const page of pages) {
      if (!areaByKey.has(page.key) && rule.match(page.key, page)) {
        areaByKey.set(page.key, area);
      }
    }
  }

  for (const page of pages) {
    const area = areaByKey.get(page.key);
    if (!area) continue;
    const group = groups.find((g) => g.area.key === area.key);
    if (!group) continue;
    const entry: DirectoryEntry = {
      page,
      provisioned: Boolean(document.pageLayouts?.[page.key]?.length),
      areaKey: area.key,
    };
    group.entries.push(entry);
  }

  return groups.filter((g) => g.area.design || g.entries.length > 0);
}

/**
 * Resolves which page to open first when Studio mounts.
 * Prefers auth-login or student-dashboard.
 */
export function resolveInitialPageKey(
  manifest: StudioManifest,
  document: WorkspaceDocument,
): string {
  const pages = normalizePageCatalog(manifest.pageCatalog);
  const preferred = pages.find(
    (p) => p.key === "auth-login" || p.key === "portal-student-dashboard",
  );
  if (preferred && document.pageLayouts?.[preferred.key]?.length) {
    return preferred.key;
  }
  const provisioned = pages.find((p) =>
    Boolean(document.pageLayouts?.[p.key]?.length),
  );
  return (
    provisioned?.key ?? pages[0]?.key ?? manifest.defaultPageKey ?? "auth-login"
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE IR (ORDERED NODES WITH PROTECTED FUNCTIONAL BOUNDARIES)
// ─────────────────────────────────────────────────────────────────────────────

const PROTECTED_CAPABILITY_PATTERN =
  /auth|submit|validation|permission|rbac|payment|data|api|route|session|smartlock|gps/i;

function protectedNoticeFor(
  capabilities: string[],
  componentName: string,
): { topics: string[]; notice: string } {
  const functional = capabilities.filter((c) =>
    PROTECTED_CAPABILITY_PATTERN.test(c),
  );
  if (functional.length === 0) {
    return { topics: [], notice: "" };
  }
  const topics = ["application logic", "security & backend data"];
  return {
    topics,
    notice: `${componentName}'s ${topics.join(" and ")} are securely protected by GN-Apex. You can customize visual layout and styles freely without breaking system functions.`,
  };
}

export function buildPageIR(
  manifest: StudioManifest,
  document: WorkspaceDocument,
  pageKey: string,
): PageIR {
  const pages = normalizePageCatalog(manifest?.pageCatalog ?? []);
  const page = pages.find((p) => p.key === pageKey);
  const byId = new Map((manifest?.components ?? []).map((c) => [c.id, c]));
  const instances: LayoutInstance[] = document?.pageLayouts?.[pageKey] ?? [];

  const nodes: IRNode[] = instances.map((instance, index) => {
    const orderKey = `${pageKey}#${index}`;
    const manifestFor = byId.get(instance.componentId);
    const componentName = manifestFor?.name ?? instance.componentId;

    const groups: Record<IRNodeGroup, ManifestField[]> = {
      content: [],
      appearance: [],
      settings: [],
    };
    for (const field of manifestFor?.fields ?? []) {
      groups[classifyField(field)].push(field);
    }

    const { topics, notice } = protectedNoticeFor(
      manifestFor?.capabilities ?? [],
      componentName,
    );

    return {
      instanceId: instance.instanceId ?? orderKey,
      orderKey,
      componentId: instance.componentId,
      componentName,
      componentDescription: manifestFor?.description ?? null,
      category: manifestFor?.category ?? "unknown",
      props: {
        ...(manifestFor?.defaultProps ?? {}),
        ...(instance.props ?? {}),
      },
      layout: instance.layout,
      contractKnown: Boolean(manifestFor),
      contentFields: groups.content,
      appearanceFields: groups.appearance,
      settingFields: groups.settings,
      protectedNotice: notice,
      protectedTopics: topics,
    };
  });

  return {
    pageKey,
    pageLabel: page?.label ?? humanizeKey(pageKey),
    required: page?.required ?? false,
    nodes,
  };
}
