import { redirect } from 'next/navigation';

// /portal/qa -> the QA Dashboard (distinct child paths keep the sidebar
// active-highlighting unambiguous).
export default function QaIndexPage() {
  redirect('/portal/qa/dashboard');
}
