
import type {Metadata} from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'My Profile | CricMate',
  description: 'Manage your user profile.',
};

export default function ProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {children}
    </Suspense>
  );
}
