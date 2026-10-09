// Shared marketing boundary. Match full segments so /portal-example stays public.
export function isPrivateAppPath(pathname = '') {
  return ['/portal', '/admin', '/platform', '/signup'].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
