
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';

const newPlayerSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    phoneNumber: z.string().min(10, 'Phone number must be at least 10 digits.'),
    email: z.string().email("Invalid email address.").optional().or(z.literal('')),
});
type NewPlayerFormValues = z.infer<typeof newPlayerSchema>;

function NewPlayerDialog({ onPlayerCreated }: { onPlayerCreated: (player: UserProfile) => void }) {
    const [open, setOpen] = useState(false);
    const { registerNewPlayer } = useAuth();
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();
    const form = useForm<NewPlayerFormValues>({ resolver: zodResolver(newPlayerSchema) });

    const handleCreatePlayer = async (data: NewPlayerFormValues) => {
        setLoading(true);
        try {
            const newUserProfile = await registerNewPlayer(data.name, data.phoneNumber, data.email);
            if (newUserProfile) {
                toast({ 
                    title: "Player Created!", 
                    description: `${data.name} can now log in using their phone number as a temporary password.` 
                });
                onPlayerCreated(newUserProfile);
                setOpen(false);
                form.reset();
            }
        } catch (error: any) {
            toast({ title: "Creation Failed", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button variant="outline">
                    <UserPlus className="mr-2 h-4 w-4"/>
                    Register New Player
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Register New Player</DialogTitle>
                    <DialogDescription>Quickly add a new player. Their phone number will be their temporary password.</DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(handleCreatePlayer)} className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="new-player-name">Full Name</Label>
                        <Input id="new-player-name" {...form.register('name')} />
                        {form.formState.errors.name && <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>}
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="new-player-phone">Phone Number</Label>
                        <Input id="new-player-phone" {...form.register('phoneNumber')} />
                        {form.formState.errors.phoneNumber && <p className="text-destructive text-sm">{form.formState.errors.phoneNumber.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-player-email">Email (Optional)</Label>
                        <Input id="new-player-email" {...form.register('email')} />
                        {form.formState.errors.email && <p className="text-destructive text-sm">{form.formState.errors.email.message}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Player'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}


export function PlayerSearchDialog({ 
    open, 
    onOpenChange, 
    onPlayerSelect 
}: { 
    open: boolean;
    onOpenChange: (open: boolean) => void; 
    onPlayerSelect: (player: UserProfile) => void; 
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const { searchUsers } = useAuth();

    const handleSearch = async () => {
        if (searchTerm.trim().length < 3) {
            setSearchResults([]);
            return;
        }
        setLoading(true);
        try {
            const results = await searchUsers(searchTerm);
            setSearchResults(results);
        } catch (error) {
            console.error("Error searching users:", error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerSelect = (player: UserProfile) => {
        onPlayerSelect(player);
        setSearchTerm('');
        setSearchResults([]);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setSearchTerm('');
                setSearchResults([]);
            }
            onOpenChange(isOpen);
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Search for a Player</DialogTitle>
                    <DialogDescription>Search by name or phone number.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Enter name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                    {loading && <p>Searching...</p>}
                    {!loading && searchResults.length === 0 && searchTerm.length > 2 && (
                         <div className="text-center text-muted-foreground p-4">
                            <p>No players found.</p>
                         </div>
                    )}
                    {searchResults.map(player => (
                        <div key={player.uid} className="flex items-center justify-between p-2 border rounded-md">
                            <div>
                                <p className="font-semibold">{player.name}</p>
                                <p className="text-sm text-muted-foreground">{player.phoneNumber}</p>
                            </div>
                            <Button size="sm" onClick={() => handlePlayerSelect(player)}>Add</Button>
                        </div>
                    ))}
                </div>
                 <DialogFooter>
                    <NewPlayerDialog onPlayerCreated={handlePlayerSelect} />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
