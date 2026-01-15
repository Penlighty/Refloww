import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'react-hot-toast';
import ThemeProvider from "@/components/ThemeProvider";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { EncryptionProvider } from "@/contexts/EncryptionContext";
import EncryptionUnlockModal from "@/components/EncryptionUnlockModal";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Refloww - Financial Documentation Manager",
  description: "Create professional invoices, receipts, and delivery notes with custom templates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className="antialiased font-display bg-background-light dark:bg-background-dark text-neutral-900 dark:text-neutral-100 h-screen flex overflow-hidden selection:bg-blue-500 selection:text-white transition-colors" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <EncryptionProvider>
              <KeyboardShortcuts>
                <AppShell>
                  {children}
                </AppShell>
              </KeyboardShortcuts>
              <EncryptionUnlockModal />
            </EncryptionProvider>
          </AuthProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--toast-bg, #fff)',
                color: 'var(--toast-color, #1a1a1a)',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
