
import { AuthProvider } from '@/contexts/auth-context';
import { Suspense } from 'react';

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthProvider>
      <Suspense fallback={<div>Loading...</div>}>
        {children}
      </Suspense>
    </AuthProvider>
  );
}
