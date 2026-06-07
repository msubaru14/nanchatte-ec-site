"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../../contexts/AuthContext";
import { ApiError } from "../../../lib/errors";
import { login } from "../api";
import styles from "./AuthForm.module.css";

type AdminLoginFormProps = {
  returnTo: string;
};

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function AdminLoginForm({ returnTo }: AdminLoginFormProps) {
  const router = useRouter();
  const { isLoading, setUser, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isLoading || !user) {
      return;
    }

    if (user.roles.includes("admin")) {
      router.replace(returnTo);
      return;
    }

    setFormError("管理者権限がありません。");
  }, [isLoading, returnTo, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const nextUser = await login({ email, password });
      setUser(nextUser);

      if (!nextUser.roles.includes("admin")) {
        setFormError("管理者権限がありません。");
        return;
      }

      router.push(returnTo);
    } catch (error) {
      if (error instanceof ApiError) {
        const nextFieldErrors: FieldErrors = {};

        for (const detail of error.validationDetails) {
          if (detail.field === "email" || detail.field === "password") {
            nextFieldErrors[detail.field] = detail.message;
          }
        }

        setFieldErrors(nextFieldErrors);
        setFormError(error.message);
      } else {
        setFormError("認証処理に失敗しました。もう一度お試しください。");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="admin-login-title">
      <div className={styles.card}>
        <p className={styles.eyebrow}>Admin Login</p>
        <h1 className={styles.title} id="admin-login-title">
          管理者ログイン
        </h1>
        <p className={styles.description}>管理者専用です。</p>

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <form className={styles.form} method="post" onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>メールアドレス</span>
            <input
              autoComplete="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
            />
            {fieldErrors.email && (
              <span className={styles.fieldError}>{fieldErrors.email}</span>
            )}
          </label>

          <label className={styles.field}>
            <span>パスワード</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
            />
            {fieldErrors.password && (
              <span className={styles.fieldError}>{fieldErrors.password}</span>
            )}
          </label>

          <button
            className={styles.submit}
            disabled={!isReady || isSubmitting}
            type="submit"
          >
            {isSubmitting ? "送信中..." : "管理者としてログイン"}
          </button>
        </form>

        <p className={styles.alternative}>
          通常画面へ戻る
          <Link href="/products">商品一覧へ</Link>
        </p>
      </div>
    </section>
  );
}
