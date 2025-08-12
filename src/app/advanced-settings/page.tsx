
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ADVANCED_SETTINGS_KEY = 'cricketAdvancedSettings';

export default function AdvancedSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [noBallEnabled, setNoBallEnabled] = useState(true);
  const [noBallReball, setNoBallReball] = useState(true);
  const [noBallRun, setNoBallRun] = useState(1);

  const [wideBallEnabled, setWideBallEnabled] = useState(true);
  const [wideBallReball, setWideBallReball] = useState(true);
  const [wideBallRun, setWideBallRun] = useState(1);
  
  const [ballsPerOver, setBallsPerOver] = useState(6);

  useEffect(() => {
    const savedSettings = localStorage.getItem(ADVANCED_SETTINGS_KEY);
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setNoBallEnabled(settings.noBall?.enabled ?? true);
      setNoBallReball(settings.noBall?.reball ?? true);
      setNoBallRun(settings.noBall?.run ?? 1);
      setWideBallEnabled(settings.wideBall?.enabled ?? true);
      setWideBallReball(settings.wideBall?.reball ?? true);
      setWideBallRun(settings.wideBall?.run ?? 1);
      setBallsPerOver(settings.ballsPerOver ?? 6);
    }
  }, []);

  const handleSave = () => {
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
    localStorage.setItem(ADVANCED_SETTINGS_KEY, JSON.stringify(settings));
    toast({
      title: "Settings Saved!",
      description: "Your advanced match rules have been updated.",
    });
    router.back();
  };

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
