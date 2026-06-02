export function canManageContent(role: string): boolean {
  return role === "admin" || role === "editor";
}

export function canManageOwnedContent(
  session: { userId: string; role: string },
  ownerId: string
): boolean {
  return session.role === "admin" || (session.role === "editor" && ownerId === session.userId);
}
