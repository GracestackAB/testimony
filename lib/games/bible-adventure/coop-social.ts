export function canUserAccessSave(
  save: { user_id: string; partner_id?: string | null },
  userId: string
): boolean {
  return save.user_id === userId || save.partner_id === userId;
}

export function isUsersTurn(
  save: { active_turn_user_id?: string | null; coop_status?: string; user_id: string },
  userId: string
): boolean {
  if (save.coop_status !== "active") return true;
  return (save.active_turn_user_id ?? save.user_id) === userId;
}
