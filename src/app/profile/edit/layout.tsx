
import type {Metadata} from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Edit Profile | CricMate',
  description: 'Edit your user profile.',
};

export default function EditProfileLayout({
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
