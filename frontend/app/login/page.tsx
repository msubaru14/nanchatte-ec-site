import { AuthForm } from "../../features/auth/components/AuthForm";
import { getSafeReturnTo } from "../../features/auth/utils/returnTo";

type LoginPageProps = {
  searchParams: Promise<{
    returnTo?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnTo } = await searchParams;

  return <AuthForm mode="login" returnTo={getSafeReturnTo(returnTo)} />;
}
