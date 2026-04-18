import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmail("test@photoai.app");
    setName("Test User");
    setLoading(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success("Profile updated successfully");
  };

  if (loading) {
    return (
       <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
       </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold text-foreground">
        Settings
      </motion.h1>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card shadow-soft p-6 space-y-6">
        <div>
          <h2 className="font-medium text-foreground">Profile</h2>
          <p className="text-sm text-muted-foreground">Update your account information</p>
        </div>
        <Separator />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your Name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={email} readOnly type="email" className="bg-secondary/50 text-muted-foreground" />
          </div>
          {/* <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" placeholder="••••••••" disabled />
            <p className="text-xs text-muted-foreground mt-1">To change password, use the reset button on login.</p>
          </div> */}
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </motion.div>
    </div>
  );
}
