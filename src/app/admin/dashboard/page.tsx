
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BarChart, Shield, LogOut } from 'lucide-react';
import withAuth from '@/components/with-auth';

function AdminDashboardPage() {
  const { user, userProfile, logout, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/admin/login');
      } else if (userProfile?.role !== 'admin') {
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to view this page.',
          variant: 'destructive',
        });
        router.replace('/matches');
      }
    }
  }, [user, userProfile, loading, router]);
  
  if (loading || userProfile?.role !== 'admin') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-background text-foreground shadow-md">
        <div className="container mx-auto p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
            </div>
          <Button variant="ghost" onClick={logout}><LogOut className="mr-2 h-4 w-4" /> Logout</Button>
        </div>
      </header>
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Users /> Manage Users</CardTitle>
              <CardDescription>View, edit, and manage user accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Go to User Management</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart /> Site Analytics</CardTitle>
               <CardDescription>Monitor website traffic and usage statistics.</CardDescription>
            </CardHeader>
            <CardContent>
               <Button className="w-full">View Analytics</Button>
            </CardContent>
          </Card>
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield /> System Settings</CardTitle>
              <CardDescription>Configure global application settings.</CardDescription>
            </CardHeader>
            <CardContent>
               <Button className="w-full">Adjust Settings</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default withAuth(AdminDashboardPage);
