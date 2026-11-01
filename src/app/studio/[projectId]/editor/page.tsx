// studio/src/app/studio/[projectId]/editor/page.tsx

import {
  EditorRoute,
  type EditorRouteProps,
} from "@/components/gnapex-studio/editor-route";

export default function EditorPage({ params, searchParams }: EditorRouteProps) {
  return <EditorRoute params={params} searchParams={searchParams} />;
}
