import { redirect } from 'next/navigation';

/**
 * Root page — redirect based on auth context.
 * The middleware handles the redirect logic; this is a fallback.
 */
export default function RootPage() {
  redirect('/store');
}
