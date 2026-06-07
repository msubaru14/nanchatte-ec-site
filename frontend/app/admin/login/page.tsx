import { AdminLoginForm } from "../../../features/auth/components/AdminLoginForm";
import { getSafeAdminReturnTo } from "../../../features/auth/utils/returnTo";

type AdminLoginPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const { returnTo } = await searchParams;

  return <AdminLoginForm returnTo={getSafeAdminReturnTo(returnTo)} />;
}
