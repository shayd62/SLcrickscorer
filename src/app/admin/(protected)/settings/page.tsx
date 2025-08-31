
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function AdminSettingsPage() {
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
                <Input id="theme" type="color" defaultValue="#3b82f6" className="w-24"/>
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
                    <Label>New User Registration</Label>
                    <p className="text-xs text-muted-foreground">Allow new users to sign up.</p>
                </div>
                <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <Label>Tournament Creation</Label>
                    <p className="text-xs text-muted-foreground">Allow users to create new tournaments.</p>
                </div>
                <Switch defaultChecked />
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
                    <Textarea id="announcement" placeholder="e.g., Scheduled maintenance on Sunday at 2 AM UTC." />
                </div>
                <div className="flex items-center justify-between">
                    <Label>Enable Announcement</Label>
                    <Switch />
                </div>
            </CardContent>
        </Card>
         <Button>Save All Settings</Button>
    </div>
  );
}
