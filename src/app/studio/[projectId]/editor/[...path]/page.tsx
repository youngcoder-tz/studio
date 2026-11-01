// studio/src/app/studio/[projectId]/editor/[...path]/page.tsx
//
// Folder and file locations in the Pages explorer. Examples:
//   /editor/auth
//   /editor/auth/login
//   /editor/students/studentId/results
//
// `/editor` itself is served by the sibling page.tsx and resolves to the
// overview, not an automatically selected page.

import { EditorRoute } from "@/components/gnapex-studio/editor-route";

export default function EditorPathPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string; path: string[] }>;
  searchParams: Promise<{ station?: string | string[] }>;
}) {
  return <EditorRoute params={params} searchParams={searchParams} />;
}
