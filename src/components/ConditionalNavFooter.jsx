'use client';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

const HIDE_ROUTES = ['/admin', '/portal'];

export default function ConditionalNavFooter() {
  const pathname = usePathname();
  const hide = HIDE_ROUTES.some((r) => pathname.startsWith(r));
  if (hide) return null;
  return (
    <>
      <Navbar />
      <Footer />
    </>
  );
}
