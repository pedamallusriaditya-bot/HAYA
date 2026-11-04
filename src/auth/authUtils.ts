export const AUTHORIZED_EMAILS = [
  'pedamallusriaditya@gmail.com',
  'pasulaharika61@gmail.com',
] as const;

export function isAuthorizedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return (AUTHORIZED_EMAILS as readonly string[]).includes(clean);
}

