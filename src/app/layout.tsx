import type { Metadata, Viewport } from "next";
import { Inter, Bricolage_Grotesque, Playfair_Display, Courier_Prime, DM_Sans } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { EncryptionProvider } from "@/contexts/EncryptionContext";
import EncryptionUnlockModal from "@/components/EncryptionUnlockModal";
import AppShell from "@/components/AppShell";
import { SwipeableToaster } from "@/components/ui/SwipeableToaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-bricolage",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
  preload: false,
});

const courier = Courier_Prime({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-courier",
  display: "swap",
  preload: false,
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Refloww - Financial Documentation Manager",
  description: "Create professional invoices, receipts, and delivery notes with custom templates",
  icons: {
    icon: [
      { url: '/logo/refloww-icon-orange.svg', type: 'image/svg+xml' },
      { url: '/logo/refloww-icon-orange.png', type: 'image/png' },
    ],
    shortcut: '/logo/refloww-icon-orange.svg',
    apple: '/logo/refloww-icon-orange-bg.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f3" },
    { media: "(prefers-color-scheme: dark)", color: "#121519" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`light ${inter.variable} ${bricolage.variable} ${playfair.variable} ${courier.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="antialiased font-display bg-ground text-ink h-dvh flex overflow-hidden suppressHydrationWarning">
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
          <SwipeableToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

