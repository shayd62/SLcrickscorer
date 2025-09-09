
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Tournament } from '@/lib/types';

export default function TournamentAdvancedSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const tournamentId = params.tournamentId as string;

  const [loading, setLoading] = useState(true);
  const [noBallEnabled, setNoBallEnabled] = useState(true);
  const [noBallReball, setNoBallReball] = useState(true);
  const [noBallRun, setNoBallRun] = useState(1);

  const [wideBallEnabled, setWideBallEnabled] = useState(true);
  const [wideBallReball, setWideBallReball] = useState(true);
  const [wideBallRun, setWideBallRun] = useState(1);
  
  const [ballsPerOver, setBallsPerOver] = useState(6);

  useEffect(() => {
    if (tournamentId) {
        const fetchTournament = async () => {
            const docRef = doc(db, "tournaments", tournamentId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const tournament = docSnap.data() as Tournament;
                setNoBallEnabled(tournament.noBall?.enabled ?? true);
                setNoBallReball(tournament.noBall?.reball ?? true);
                setNoBallRun(tournament.noBall?.run ?? 1);
                setWideBallEnabled(tournament.wideBall?.enabled ?? true);
                setWideBallReball(tournament.wideBall?.reball ?? true);
                setWideBallRun(tournament.wideBall?.run ?? 1);
                setBallsPerOver(tournament.ballsPerOver ?? 6);
            }
            setLoading(false);
        };
        fetchTournament();
    }
  }, [tournamentId]);

  const handleSave = async () => {
    const settings = {
      noBall: {
        enabled: noBallEnabled,
        reball: noBallReball,
        run: noBallRun,
      },
      wideBall: {
        enabled: wideBallEnabled,
        reball: wideBallReball,
        run: wideBallRun,
      },
      ballsPerOver,
    };
    
    try {
        const docRef = doc(db, "tournaments", tournamentId);
        await updateDoc(docRef, settings);
        toast({
            title: "Settings Saved!",
            description: "The advanced match rules for this tournament have been updated.",
        });
        router.back();
    } catch(e) {
        toast({
            title: "Error",
            description: "Failed to save settings.",
            variant: "destructive"
        })
    }
  };
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading settings...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 text-foreground font-body">
       <header className="py-4 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
         <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div className='flex flex-col items-center'>
            <h1 className="text-2xl font-bold">Advanced Settings</h1>
            <p className="text-sm text-muted-foreground">Configure custom match rules</p>
          </div>
          <div className="w-10"></div>
      </header>
      <main className="p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-md space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Balls per Over</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <Label htmlFor="balls-per-over">Number of legal balls</Label>
                <Input
                  id="balls-per-over"
                  type="number"
                  className="w-16"
                  value={ballsPerOver}
                  onChange={(e) => setBallsPerOver(Number(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>No Ball</CardTitle>
                <Switch
                  checked={noBallEnabled}
                  onCheckedChange={setNoBallEnabled}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <Label htmlFor="nb-reball">Re-ball</Label>
                <Switch
                  id="nb-reball"
                  checked={noBallReball}
                  onCheckedChange={setNoBallReball}
                  disabled={!noBallEnabled}
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <Label htmlFor="nb-run">No ball run</Label>
                <Input
                  id="nb-run"
                  type="number"
                  className="w-16"
                  value={noBallRun}
                  onChange={(e) => setNoBallRun(Number(e.target.value))}
                  disabled={!noBallEnabled}
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Wide Ball</CardTitle>
                 <Switch
                  checked={wideBallEnabled}
                  onCheckedChange={setWideBallEnabled}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <Label htmlFor="wd-reball">Re-ball</Label>
                <Switch
                  id="wd-reball"
                  checked={wideBallReball}
                  onCheckedChange={setWideBallReball}
                  disabled={!wideBallEnabled}
                />
              </div>
               <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
                <Label htmlFor="wd-run">Wide ball run</Label>
                <Input
                  id="wd-run"
                  type="number"
                  className="w-16"
                  value={wideBallRun}
                  onChange={(e) => setWideBallRun(Number(e.target.value))}
                  disabled={!wideBallEnabled}
                />
              </div>
            </CardContent>
          </Card>
           <Button className="w-full text-lg py-6" onClick={handleSave}>
              Save settings
           </Button>
        </div>
      </main>
    </div>
  );
}
