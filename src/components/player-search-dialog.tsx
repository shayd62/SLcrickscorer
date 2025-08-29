
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile } from '@/lib/types';

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
                    {!loading && searchResults.length === 0 && searchTerm.length > 2 && <p>No players found.</p>}
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
            </DialogContent>
        </Dialog>
    );
}
