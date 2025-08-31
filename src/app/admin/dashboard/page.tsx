
'use client';

import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, BarChart, Shield, LogOut, DatabaseZap } from 'lucide-react';
import withAuth from '@/components/with-auth';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


function AdminDashboardPage() {
  const { user, userProfile, logout, loading, resetDatabase } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);

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
  }, [user, userProfile, loading, router, toast]);
  
  const handleResetDatabase = async () => {
    setIsResetting(true);
    try {
        await resetDatabase();
        toast({
            title: "Database Reset Successful",
            description: "All matches, teams, and tournaments have been cleared.",
        });
    } catch (error) {
        console.error("Failed to reset database:", error);
        toast({
            title: "Database Reset Failed",
            description: "An error occurred while trying to reset the database.",
            variant: "destructive",
        });
    } finally {
        setIsResetting(false);
    }
  };

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
          <Card className="md:col-span-2 lg:col-span-3">
             <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><DatabaseZap /> Danger Zone</CardTitle>
                <CardDescription>Critical operations that can result in data loss.</CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={isResetting}>
                            {isResetting ? 'Resetting...' : 'Reset Database'}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete all matches, teams, and tournament data from the database.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetDatabase}>
                                Yes, reset the database
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default withAuth(AdminDashboardPage);
