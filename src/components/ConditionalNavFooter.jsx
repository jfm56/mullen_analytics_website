'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

const HIDE_ROUTES = ['/admin', '/portal'];

export function ConditionalNav() {
  const pathname = usePathname();
  const hide = HIDE_ROUTES.some((r) => pathname.startsWith(r));
  if (hide) return null;
  return <Navbar />;
}

export function ConditionalFooter() {
  const pathname = usePathname();
  const hide = HIDE_ROUTES.some((r) => pathname.startsWith(r));
  if (hide) return null;
  return <Footer />;
}

export default function ConditionalNavFooter() {
  return null;
}
