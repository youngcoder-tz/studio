// studio/src/app/studio/[projectId]/page.tsx
//
// THE STUDIO ENTRY POINT.
//
// The original inline studio shell that lived on this route has been replaced
// by the GN-Apex Studio at `/studio/[projectId]/editor` — the client-facing
// visual control plane built on the workspace contract, the Visual IR and the
// typed preview bridge.
//
// This route now exists only so that every historical link (project lists,
// bookmarks, the setup wizard's finish step) lands on the current Studio.
// The redirect is server-side: no client bundle, no flash, no dead state.

import { redirect } from 'next/navigation';

export default async function StudioLandingRedirect({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/studio/${projectId}/editor`);
}
