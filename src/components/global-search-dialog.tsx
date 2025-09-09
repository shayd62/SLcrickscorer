
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, User, Trophy, Gamepad2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/auth-context';
import type { UserProfile, MatchState, Tournament } from '@/lib/types';
import { useRouter } from 'next/navigation';

export function GlobalSearchDialog({ 
    open, 
    onOpenChange, 
}: { 
    open: boolean;
    onOpenChange: (open: boolean) => void; 
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        players: UserProfile[];
        matches: MatchState[];
        tournaments: Tournament[];
    }>({ players: [], matches: [], tournaments: [] });
    
    const { globalSearch } = useAuth();
    const router = useRouter();

    const handleSearch = async () => {
        if (searchTerm.trim().length < 3) {
            setResults({ players: [], matches: [], tournaments: [] });
            return;
        }
        setLoading(true);
        try {
            const searchResults = await globalSearch(searchTerm);
            setResults(searchResults);
        } catch (error) {
            console.error("Error during global search:", error);
            setResults({ players: [], matches: [], tournaments: [] });
        } finally {
            setLoading(false);
        }
    };
    
    const navigateTo = (path: string) => {
        router.push(path);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            if (!isOpen) {
                setSearchTerm('');
                setResults({ players: [], matches: [], tournaments: [] });
            }
            onOpenChange(isOpen);
        }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Global Search</DialogTitle>
                    <DialogDescription>Search for players, matches, or tournaments.</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Enter name, team, tournament..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <div className="mt-4 space-y-4 max-h-80 overflow-y-auto">
                    {loading && <p>Searching...</p>}
                    {!loading && searchTerm.length > 2 && (
                        <>
                            {results.players.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2"><User className="h-4 w-4"/> Players</h4>
                                    {results.players.map(p => (
                                        <div key={p.uid} onClick={() => navigateTo(`/profile/${p.id}`)} className="p-2 border rounded-md cursor-pointer hover:bg-secondary">
                                            <p>{p.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                             {results.matches.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2"><Gamepad2 className="h-4 w-4"/> Matches</h4>
                                    {results.matches.map(m => (
                                        <div key={m.id} onClick={() => navigateTo(`/scorecard/${m.id}`)} className="p-2 border rounded-md cursor-pointer hover:bg-secondary">
                                            <p>{m.config.team1.name} vs {m.config.team2.name}</p>
                                            <p className="text-xs text-muted-foreground">{m.resultText}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                             {results.tournaments.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2"><Trophy className="h-4 w-4"/> Tournaments</h4>
                                    {results.tournaments.map(t => (
                                        <div key={t.id} onClick={() => navigateTo(`/tournaments/${t.id}`)} className="p-2 border rounded-md cursor-pointer hover:bg-secondary">
                                            <p>{t.name}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {results.players.length === 0 && results.matches.length === 0 && results.tournaments.length === 0 && (
                                 <div className="text-center text-muted-foreground p-4">
                                    <p>No results found.</p>
                                 </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
