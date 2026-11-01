// studio/src/lib/gnapex-studio/vfs.ts
import type { PageDefinition } from "../contract";

export interface VFSFile {
  type: "file";
  id: string; // Original route key (e.g. 'auth-login' or 'portal-student-results')
  name: string; // Clean display name (e.g. 'results')
  routePath: string; // Route path (e.g. '/students/:id/results')
  label: string; // Friendly title
  role: "student" | "teacher" | "parent" | "public" | "auth";
  required?: boolean;
}

export interface VFSFolder {
  type: "folder";
  id: string; // Folder key (e.g. 'auth', 'students', '[studentId]')
  name: string;
  label: string;
  description: string;
  icon: string;
  tone: string;
  children: Record<string, VFSNode>;
}

export type VFSNode = VFSFolder | VFSFile;

export interface VFSRoot {
  folders: Record<string, VFSFolder>;
  totalCount: number;
}

// Domain metadata and grouping rules for Workspace Modes
const DOMAIN_METADATA: Record<
  string,
  { label: string; desc: string; icon: string; tone: string }
> = {
  auth: {
    label: "Authentication",
    desc: "Sign in, student claim, and account recovery",
    icon: "🔐",
    tone: "#6366f1",
  },
  public: {
    label: "Public & Admissions",
    desc: "Public visitor desk, bus tracking, and admissions",
    icon: "🌐",
    tone: "#06b6d4",
  },
  students: {
    label: "Students",
    desc: "Roster, student academic results, timetable, and fees",
    icon: "🎓",
    tone: "#0ea5e9",
  },
  parents: {
    label: "Parents & Guardians",
    desc: "Guardian portal, ward results, and fee payments",
    icon: "👪",
    tone: "#f59e0b",
  },
  teachers: {
    label: "Teachers & Staff",
    desc: "Classroom grading, roll call register, and schedules",
    icon: "🧑‍🏫",
    tone: "#10b981",
  },
};

/**
 * Normalizes flat hyphenated route keys (e.g. portal-student-fees)
 * into a rich Virtual File System with nested folders and files.
 */
export function buildVFS(catalog: PageDefinition[]): VFSRoot {
  const folders: Record<string, VFSFolder> = {
    auth: {
      type: "folder",
      id: "auth",
      name: "auth",
      label: DOMAIN_METADATA.auth.label,
      description: DOMAIN_METADATA.auth.desc,
      icon: DOMAIN_METADATA.auth.icon,
      tone: DOMAIN_METADATA.auth.tone,
      children: {},
    },
    public: {
      type: "folder",
      id: "public",
      name: "public",
      label: DOMAIN_METADATA.public.label,
      description: DOMAIN_METADATA.public.desc,
      icon: DOMAIN_METADATA.public.icon,
      tone: DOMAIN_METADATA.public.tone,
      children: {},
    },
    students: {
      type: "folder",
      id: "students",
      name: "students",
      label: DOMAIN_METADATA.students.label,
      description: DOMAIN_METADATA.students.desc,
      icon: DOMAIN_METADATA.students.icon,
      tone: DOMAIN_METADATA.students.tone,
      children: {},
    },
    parents: {
      type: "folder",
      id: "parents",
      name: "parents",
      label: DOMAIN_METADATA.parents.label,
      description: DOMAIN_METADATA.parents.desc,
      icon: DOMAIN_METADATA.parents.icon,
      tone: DOMAIN_METADATA.parents.tone,
      children: {},
    },
    teachers: {
      type: "folder",
      id: "teachers",
      name: "teachers",
      label: DOMAIN_METADATA.teachers.label,
      description: DOMAIN_METADATA.teachers.desc,
      icon: DOMAIN_METADATA.teachers.icon,
      tone: DOMAIN_METADATA.teachers.tone,
      children: {},
    },
  };

  let totalCount = 0;

  for (const page of catalog) {
    totalCount++;
    const key = page.key;
    let targetFolder = folders.public;
    let fileName = key;
    let role: VFSFile["role"] = "public";

    if (key.startsWith("auth-") || key.startsWith("auth/")) {
      targetFolder = folders.auth;
      fileName = key.replace(/^auth[-/]/, "");
      role = "auth";
    } else if (
      key.startsWith("portal-student-") ||
      key.startsWith("students/")
    ) {
      targetFolder = folders.students;
      fileName = key.replace(/^(portal-student-|students\/)/, "");
      role = "student";
    } else if (key.startsWith("portal-parent-") || key.startsWith("parents/")) {
      targetFolder = folders.parents;
      fileName = key.replace(/^(portal-parent-|parents\/)/, "");
      role = "parent";
    } else if (
      key.startsWith("portal-staff-") ||
      key.startsWith("portal-teacher-") ||
      key.startsWith("teachers/")
    ) {
      targetFolder = folders.teachers;
      fileName = key.replace(/^(portal-staff-|portal-teacher-|teachers\/)/, "");
      role = "teacher";
    } else if (key.startsWith("public-") || key.startsWith("public/")) {
      targetFolder = folders.public;
      fileName = key.replace(/^public[-/]/, "");
      role = "public";
    }

    // Group student detail pages into a parameterized subfolder `[studentId]`
    if (
      targetFolder.id === "students" &&
      ["results", "fees", "timetable", "attendance"].includes(fileName)
    ) {
      if (!targetFolder.children["[studentId]"]) {
        targetFolder.children["[studentId]"] = {
          type: "folder",
          id: "[studentId]",
          name: "[studentId]",
          label: "Student Record",
          description: "Individual student profile & ledger",
          icon: "📁",
          tone: targetFolder.tone,
          children: {},
        };
      }
      const sub = targetFolder.children["[studentId]"] as VFSFolder;
      sub.children[fileName] = {
        type: "file",
        id: key,
        name: fileName,
        routePath: `/students/:studentId/${fileName}`,
        label: page.label || fileName,
        role,
        required: page.required,
      };
    } else {
      targetFolder.children[fileName] = {
        type: "file",
        id: key,
        name: fileName,
        routePath: `/${targetFolder.id}/${fileName}`,
        label: page.label || fileName,
        role,
        required: page.required,
      };
    }
  }

  // Remove empty groups if catalog lacks items
  for (const [k, folder] of Object.entries(folders)) {
    if (Object.keys(folder.children).length === 0) {
      delete folders[k];
    }
  }

  return { folders, totalCount };
}

export function countFiles(node: VFSNode): number {
  if (node.type === "file") return 1;
  return Object.values(node.children).reduce(
    (acc, child) => acc + countFiles(child),
    0,
  );
}

/**
 * Canonical URL segment for a VFS node.
 *
 * The explorer keeps its tree names human-readable (`[studentId]`), while the
 * address bar uses a clean route segment (`studentId`). Both forms resolve,
 * but only this one is ever written back to history.
 */
export function vfsUrlSegment(node: VFSNode): string {
  if (node.type === "folder") {
    const dynamic = /^\[(.+)\]$/.exec(node.name);
    if (dynamic) return dynamic[1];
  }
  return node.name;
}

export interface VFSFileLocation {
  file: VFSFile;
  /** Store path, including dynamic folder names: `students/[studentId]`. */
  folderPath: string[];
  /** Store path plus the file name. */
  filePath: string[];
  /** Canonical URL path: `students/studentId/results`. */
  urlPath: string[];
}

export interface VFSResolvedPath {
  kind: "folder" | "file";
  folder: VFSFolder;
  file: VFSFile | null;
  /** Store path to the folder. */
  folderPath: string[];
  /** Canonical URL path to the folder or file. */
  urlPath: string[];
}

function findRootFolder(vfs: VFSRoot, segment: string): VFSFolder | null {
  return (
    Object.entries(vfs.folders).find(
      ([key, folder]) =>
        key === segment ||
        folder.id === segment ||
        folder.name === segment ||
        vfsUrlSegment(folder) === segment,
    )?.[1] ?? null
  );
}

function findChild(folder: VFSFolder, segment: string): VFSNode | null {
  return (
    Object.values(folder.children).find(
      (node) =>
        node.id === segment ||
        node.name === segment ||
        vfsUrlSegment(node) === segment,
    ) ?? null
  );
}

/**
 * Resolve URL path segments into a folder or file in the VFS.
 * Returns both the store path (dynamic names preserved) and the canonical URL
 * path so invalid or alias links can be normalized.
 */
export function resolveVfsSegments(
  vfs: VFSRoot,
  segments: string[],
): VFSResolvedPath | null {
  if (segments.length === 0) return null;

  let folder = findRootFolder(vfs, segments[0]);
  if (!folder) return null;

  const folderPath = [folder.name];
  const urlFolderPath = [vfsUrlSegment(folder)];

  for (let index = 1; index < segments.length; index++) {
    const node = findChild(folder, segments[index]);
    if (!node) return null;

    if (node.type === "folder") {
      folder = node;
      folderPath.push(node.name);
      urlFolderPath.push(vfsUrlSegment(node));
      continue;
    }

    if (index !== segments.length - 1) return null;

    return {
      kind: "file",
      folder,
      file: node,
      folderPath,
      urlPath: [...urlFolderPath, vfsUrlSegment(node)],
    };
  }

  return {
    kind: "folder",
    folder,
    file: null,
    folderPath,
    urlPath: urlFolderPath,
  };
}

/**
 * Find a page by its manifest key anywhere in the VFS.
 */
export function findVfsFile(
  vfs: VFSRoot,
  fileId: string,
): VFSFileLocation | null {
  function search(
    folder: VFSFolder,
    folderPath: string[],
    urlFolderPath: string[],
  ): VFSFileLocation | null {
    for (const node of Object.values(folder.children)) {
      if (node.type === "file") {
        if (node.id === fileId || node.name === fileId) {
          return {
            file: node,
            folderPath,
            filePath: [...folderPath, node.name],
            urlPath: [...urlFolderPath, vfsUrlSegment(node)],
          };
        }
        continue;
      }

      const found = search(
        node,
        [...folderPath, node.name],
        [...urlFolderPath, vfsUrlSegment(node)],
      );
      if (found) return found;
    }
    return null;
  }

  for (const folder of Object.values(vfs.folders)) {
    const found = search(folder, [folder.name], [vfsUrlSegment(folder)]);
    if (found) return found;
  }
  return null;
}
