import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rescisões Líder",
  description: "Sistema de controle de rescisões",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" translate="no">
      <body className="notranslate">{children}</body>
    </html>
  );
}
