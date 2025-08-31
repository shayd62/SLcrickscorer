
'use client';

import AdminSidebar from '@/components/admin-sidebar';
import withAuth from '@/components/with-auth';
import React, { Suspense } from 'react';

function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        {/* You could add a header here if needed */}
        <main className="flex-1 p-8">
           <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}

// Wrap the layout with the withAuth HOC to protect all child routes
export default withAuth(ProtectedAdminLayout);
