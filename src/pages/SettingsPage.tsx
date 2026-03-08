import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>

      <div className="rounded-xl border border-border bg-card shadow-soft p-6 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">Profile</h2>
          <p className="text-sm text-muted-foreground">Update your account information</p>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input defaultValue="John Doe" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input defaultValue="john@example.com" type="email" />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
        </div>
        <Button>Save Changes</Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft p-6 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">API Keys</h2>
          <p className="text-sm text-muted-foreground">Manage your API access</p>
        </div>
        <Separator />
        <div className="space-y-2">
          <Label>API Key</Label>
          <Input defaultValue="sk-••••••••••••••••" readOnly className="font-mono text-sm" />
        </div>
        <Button variant="outline">Regenerate Key</Button>
      </div>
    </div>
  );
}
