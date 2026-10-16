export function offerSaveTarget(editingId: string | null) {
  if (editingId) {
    return { method: "PATCH" as const, path: `/api/admin/offers/${editingId}` };
  }
  return { method: "POST" as const, path: "/api/admin/offers" };
}

/** After any write, the dialog must target the saved offer. Create then stays on that id. */
export function editorAfterWrite<T extends { id: string }>(saved: T): T {
  return saved;
}
