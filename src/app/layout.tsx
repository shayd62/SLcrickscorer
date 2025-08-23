
'use client';

import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function AppBody({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const isObs = searchParams.get('obs') === 'true';

  return (
    <html lang="en" className={isObs ? 'obs-body' : ''}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body className={`font-body antialiased ${isObs ? 'obs-body' : ''}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <Suspense>
        <AppBody>{children}</AppBody>
      </Suspense>
    </AuthProvider>
  );
}
