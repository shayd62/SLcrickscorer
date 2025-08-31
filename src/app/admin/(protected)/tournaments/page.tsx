
'use client';

import { useState } from 'react';
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

const tournaments = [
  { id: 't1', name: 'Summer Championship 2024', owner: 'john.doe@example.com', status: 'approved', plan: 'pro', matches: 56 },
  { id: 't2', name: 'Winter League', owner: 'jane.smith@example.com', status: 'pending', plan: 'free', matches: 0 },
  { id: 't3', name: 'City Cup', owner: 'org1@example.com', status: 'blocked', plan: 'enterprise', matches: 120 },
  { id: 't4', name: 'Amateur Trophy', owner: 'amateur.league@example.com', status: 'approved', plan: 'free', matches: 12 },
];

export default function AdminTournamentsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTournaments = tournaments.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <TableHead>Owner</TableHead>
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
                  <div className="text-sm text-gray-500">{t.matches} matches</div>
                </TableCell>
                <TableCell>{t.owner}</TableCell>
                <TableCell><Badge variant="outline">{t.plan}</Badge></TableCell>
                <TableCell>
                  <Badge
                    variant={t.status === 'approved' ? 'default' : t.status === 'pending' ? 'secondary' : 'destructive'}
                  >
                    {t.status}
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
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Approve</DropdownMenuItem>
                        <DropdownMenuItem>Block</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Hard Delete</DropdownMenuItem>
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
