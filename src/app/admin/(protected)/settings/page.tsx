
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

const SETTINGS_DOC_ID = 'global_app_settings';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // State for all settings
  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [tournamentCreationEnabled, setTournamentCreationEnabled] = useState(true);
  const [announcementText, setAnnouncementText] = useState("");
  const [announcementEnabled, setAnnouncementEnabled] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPrimaryColor(data.primaryColor || '#3b82f6');
          setRegistrationEnabled(data.registrationEnabled ?? true);
          setTournamentCreationEnabled(data.tournamentCreationEnabled ?? true);
          setAnnouncementText(data.announcementText || '');
          setAnnouncementEnabled(data.announcementEnabled || false);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        toast({ title: "Error", description: "Could not load existing settings.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
      const settingsData = {
        primaryColor,
        registrationEnabled,
        tournamentCreationEnabled,
        announcementText,
        announcementEnabled,
      };
      await setDoc(settingsRef, settingsData, { merge: true });
      toast({ title: "Settings Saved!", description: "Your changes have been saved successfully." });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-4xl">
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
       <div>
        <h1 className="text-3xl font-bold">System Settings</h1>
        <p className="text-gray-500">Manage global application settings and branding.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>App Branding</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="logo">Application Logo</Label>
                <Input id="logo" type="file" />
                <p className="text-xs text-muted-foreground">Upload a PNG or SVG. Recommended size: 128x128px.</p>
            </div>
             <div className="space-y-2">
                <Label htmlFor="theme">Primary Color</Label>
                <Input 
                  id="theme" 
                  type="color" 
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-24"
                />
            </div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>Enable or disable major features across the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <Label htmlFor="registration-switch">New User Registration</Label>
                    <p className="text-xs text-muted-foreground">Allow new users to sign up.</p>
                </div>
                <Switch 
                  id="registration-switch"
                  checked={registrationEnabled}
                  onCheckedChange={setRegistrationEnabled}
                />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <Label htmlFor="tournament-switch">Tournament Creation</Label>
                    <p className="text-xs text-muted-foreground">Allow users to create new tournaments.</p>
                </div>
                <Switch 
                  id="tournament-switch"
                  checked={tournamentCreationEnabled}
                  onCheckedChange={setTournamentCreationEnabled}
                />
            </div>
        </CardContent>
      </Card>
        <Card>
            <CardHeader>
                <CardTitle>Global Announcement</CardTitle>
                <CardDescription>Display a banner at the top of the app for all users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="announcement">Announcement Text</Label>
                    <Textarea 
                      id="announcement" 
                      placeholder="e.g., Scheduled maintenance on Sunday at 2 AM UTC." 
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <Label htmlFor="announcement-enable">Enable Announcement</Label>
                    <Switch
                      id="announcement-enable"
                      checked={announcementEnabled}
                      onCheckedChange={setAnnouncementEnabled}
                    />
                </div>
            </CardContent>
        </Card>
         <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save All Settings'}
         </Button>
    </div>
  );
}
