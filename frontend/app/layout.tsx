import type { Metadata } from "next";
import { AppLayout } from "../components/layout/AppLayout";
import "./globals.css";

export const metadata: Metadata = {
  title: "なんちゃってECサイト",
  description: "Learning-oriented EC application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
