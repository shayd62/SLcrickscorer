
import type {Metadata} from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'My Game | CricMate',
  description: 'Your personal match center.',
};

export default function MyGameLayout({
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
