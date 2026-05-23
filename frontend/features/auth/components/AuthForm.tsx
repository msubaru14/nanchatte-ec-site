"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { useAuth } from "../../../contexts/AuthContext";
import { ApiError } from "../../../lib/errors";
import { login, register } from "../api";
import type { AuthUser } from "../api";
import styles from "./AuthForm.module.css";

type AuthFormProps = {
  mode: "login" | "register";
  returnTo: string;
};

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

const content = {
  login: {
    eyebrow: "Account",
    title: "ログイン",
    submit: "ログイン",
    alternative: "アカウントをお持ちでない方",
    alternativeLink: "新規登録へ",
    alternativePath: "/register",
  },
  register: {
    eyebrow: "Create Account",
    title: "ユーザー登録",
    submit: "登録する",
    alternative: "すでにアカウントをお持ちの方",
    alternativeLink: "ログインへ",
    alternativePath: "/login",
  },
} as const;

const buildAlternativeHref = (path: string, returnTo: string) => {
  if (returnTo === "/products") {
    return path;
  }

  return `${path}?returnTo=${encodeURIComponent(returnTo)}`;
};

export function AuthForm({ mode, returnTo }: AuthFormProps) {
  const router = useRouter();
  const { setUser } = useAuth();
  const pageContent = content[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      let user: AuthUser;

      if (mode === "register") {
        user = await register({ name, email, password });
      } else {
        user = await login({ email, password });
      }

      setUser(user);
      router.push(returnTo);
    } catch (error) {
      if (error instanceof ApiError) {
        const nextFieldErrors: FieldErrors = {};

        for (const detail of error.details) {
          if (
            detail.field === "name" ||
            detail.field === "email" ||
            detail.field === "password"
          ) {
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
    <section className={styles.page} aria-labelledby={`${mode}-title`}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>{pageContent.eyebrow}</p>
        <h1 className={styles.title} id={`${mode}-title`}>
          {pageContent.title}
        </h1>

        {formError && (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        )}

        <form className={styles.form} method="post" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label className={styles.field}>
              <span>表示名</span>
              <input
                autoComplete="name"
                name="name"
                onChange={(event) => setName(event.target.value)}
                type="text"
                value={name}
              />
              {fieldErrors.name && (
                <span className={styles.fieldError}>{fieldErrors.name}</span>
              )}
            </label>
          )}

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
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
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
            {isSubmitting ? "送信中..." : pageContent.submit}
          </button>
        </form>

        <p className={styles.alternative}>
          {pageContent.alternative}
          <Link
            href={buildAlternativeHref(pageContent.alternativePath, returnTo)}
          >
            {pageContent.alternativeLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
