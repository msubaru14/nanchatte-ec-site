import { AuthForm } from "../../features/auth/components/AuthForm";
import { getSafeReturnTo } from "../../features/auth/utils/returnTo";

type RegisterPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { returnTo } = await searchParams;

  return <AuthForm mode="register" returnTo={getSafeReturnTo(returnTo)} />;
}
