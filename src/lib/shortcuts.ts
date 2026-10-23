export interface ShortcutDef {
  id: string;
  keys: string;
  label: string;
  group: 'Edit' | 'Navigate' | 'Preview' | 'Tools';
}

export const STUDIO_SHORTCUTS: ShortcutDef[] = [
  { id: 'palette', keys: '⌘ K', label: 'Command palette', group: 'Tools' },
  { id: 'find', keys: '⌘ F', label: 'Find in workspace', group: 'Tools' },
  { id: 'help', keys: '?', label: 'Keyboard shortcuts', group: 'Tools' },
  { id: 'save', keys: '⌘ S', label: 'Save now', group: 'Edit' },
  { id: 'undo', keys: '⌘ Z', label: 'Undo', group: 'Edit' },
  { id: 'redo', keys: '⇧ ⌘ Z', label: 'Redo', group: 'Edit' },
  { id: 'duplicate', keys: '⌘ D', label: 'Duplicate selected', group: 'Edit' },
  { id: 'delete', keys: '⌫', label: 'Remove selected', group: 'Edit' },
  { id: 'escape', keys: 'Esc', label: 'Clear selection / close', group: 'Navigate' },
  { id: 'focus', keys: '⇧ F', label: 'Focus preview', group: 'Preview' },
  { id: 'draft', keys: '1', label: 'Preview draft', group: 'Preview' },
  { id: 'live', keys: '2', label: 'Preview live', group: 'Preview' },
];

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}
