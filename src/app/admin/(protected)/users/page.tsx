
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const users = [
  { id: 'u1', name: 'John Doe', email: 'john.doe@example.com', roles: ['scorer', 'viewer'], status: 'active', lastLogin: '2 hours ago' },
  { id: 'u2', name: 'Jane Smith', email: 'jane.smith@example.com', roles: ['org_admin'], status: 'active', lastLogin: '1 day ago' },
  { id: 'u3', name: 'Sam Wilson', email: 'sam.wilson@example.com', roles: ['viewer'], status: 'suspended', lastLogin: '1 week ago' },
  { id: 'u4', name: 'Alice Johnson', email: 'alice.j@example.com', roles: ['scorer'], status: 'active', lastLogin: '5 minutes ago' },
];

export default function AdminUsersPage() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>View, manage, and assign roles to users.</CardDescription>
            </div>
            <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite User
            </Button>
        </div>
        <div className="pt-4">
            <Input
                placeholder="Search by name or email..."
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
              <TableHead>User</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {user.roles.map(role => <Badge key={role} variant="secondary">{role}</Badge>)}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>{user.lastLogin}</TableCell>
                <TableCell className="text-right">
                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>Edit Roles</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">Suspend User</DropdownMenuItem>
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
