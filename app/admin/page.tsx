import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminDashboard from './AdminDashboard';
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Portfolio Admin — Mannan Khanzada' };

export default async function AdminPage() {
  const cookieStore = await cookies();
  if (!verifyAdminSession(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) redirect('/admin/login');
  return <AdminDashboard />;
}
