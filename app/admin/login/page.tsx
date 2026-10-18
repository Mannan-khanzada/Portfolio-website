import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-auth';
import AdminLoginForm from './AdminLoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin Sign In — Mannan Khanzada' };

export default async function AdminLoginPage() {
  const cookieStore = await cookies();
  if (verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) redirect('/admin');
  return <AdminLoginForm />;
}
