
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { collection, onSnapshot, query, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Tournament } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function AdminTournamentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, "tournaments"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tournamentsData = querySnapshot.docs.map(doc => ({ ...doc.data() as Tournament, id: doc.id }));
      setTournaments(tournamentsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching tournaments: ", error);
      toast({ title: "Error", description: "Failed to fetch tournaments.", variant: "destructive" });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const handleStatusChange = async (id: string, status: 'approved' | 'pending' | 'blocked') => {
    try {
      const tournamentRef = doc(db, 'tournaments', id);
      await updateDoc(tournamentRef, { status });
      toast({ title: "Status Updated", description: `Tournament status changed to ${status}.` });
    } catch (error) {
      console.error("Error updating status: ", error);
      toast({ title: "Error", description: "Failed to update tournament status.", variant: "destructive" });
    }
  };


  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.userId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tournament Management</CardTitle>
          <CardDescription>Oversee all tournaments on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading tournaments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
            <CardTitle>Tournament Management</CardTitle>
            <CardDescription>Oversee all tournaments on the platform.</CardDescription>
        </div>
        <div className="pt-4">
            <Input
                placeholder="Search by name or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tournament</TableHead>
              <TableHead>Owner ID</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTournaments.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-sm text-gray-500">{t.matches?.length || 0} matches</div>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{t.userId || 'N/A'}</TableCell>
                <TableCell><Badge variant="outline">{t.plan || 'free'}</Badge></TableCell>
                <TableCell>
                  <Badge
                    variant={t.status === 'approved' ? 'default' : t.status === 'pending' ? 'secondary' : 'destructive'}
                  >
                    {t.status || 'pending'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/tournaments/${t.id}`)}>View Details</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange(t.id, 'approved')}>Approve</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(t.id, 'pending')}>Set to Pending</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange(t.id, 'blocked')} className="text-destructive">Block</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
