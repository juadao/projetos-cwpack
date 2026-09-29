import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from '@/components/ui/toaster';
import { AppShell } from '@/components/app-shell';
import { AuthProvider } from '@/lib/auth-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'CwPack | Projetos de Validação',
  description: 'Sistema de Gestão de Projetos de Validação CwPack',
  themeColor: '#ea580c',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'CwPack',
    statusBarStyle: 'default',
  },
  icons: {
    icon: '/icon/icon-192.png',
    apple: '/icon/icon-512.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}