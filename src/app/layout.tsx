import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ThemeProvider from "@/components/ThemeProvider";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

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
          <KeyboardShortcuts>
            <Sidebar />
            <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-background-dark relative overflow-hidden transition-colors">
              <Header />
              <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
                {children}
                <div className="h-8"></div>
              </div>
            </main>
          </KeyboardShortcuts>
        </ThemeProvider>
      </body>
    </html>
  );
}
