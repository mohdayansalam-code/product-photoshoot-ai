import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, Images, AlertOctagon, Activity, Coins } from "lucide-react";

type AdminStats = {
  totalGenerations: number;
  totalFailures: number;
  creditsUsed: number;
  recentErrors: any[];
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        let secret = localStorage.getItem("admin_secret");
        let email = localStorage.getItem("admin_email");
        
        if (!secret || !email) {
           secret = window.prompt("Enter Admin Access Key:");
           email = window.prompt("Enter Admin Email Address:");
           if (secret && email) {
              localStorage.setItem("admin_secret", secret);
              localStorage.setItem("admin_email", email);
           }
        }

        const res = await fetch("/api/admin/stats", {
           headers: { 
             "x-admin-secret": secret || "", 
             "x-admin-email": email || "",
             "Content-Type": "application/json" 
           }
        });
        
        if (res.status === 403) {
            setUnauthorized(true);
            localStorage.removeItem("admin_secret");
            localStorage.removeItem("admin_email");
            return;
        }

        const data = await res.json();
        if (data.success && data.data) {
          setStats(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch admin stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  if (unauthorized) {
    return (
       <div className="p-8 flex flex-col items-center justify-center text-center py-24 space-y-4">
          <ShieldAlert className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Unauthorized Access</h2>
          <p className="text-muted-foreground w-96">You do not have administrative privileges to view this telemetry overview.</p>
          <button onClick={() => window.location.reload()} className="text-sm font-medium text-primary mt-4">Retry Authentication</button>
       </div>
    );
  }

  if (loading) {
    return <div className="p-8 flex justify-center text-muted-foreground">Loading system overview...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <ShieldAlert className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">System Oversight</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-card border border-border p-6 rounded-xl flex items-center justify-between shadow-soft">
            <div>
               <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Generations</p>
               <h3 className="text-3xl font-bold mt-1.5">{stats?.totalGenerations || 0}</h3>
            </div>
            <Images className="h-8 w-8 text-blue-500/80" />
         </motion.div>

         <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-card border border-border p-6 rounded-xl flex items-center justify-between shadow-soft">
            <div>
               <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Failure Rate</p>
               <h3 className="text-3xl font-bold mt-1.5 text-red-600">{stats?.totalFailures || 0}</h3>
            </div>
            <AlertOctagon className="h-8 w-8 text-red-500/80" />
         </motion.div>

         <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-card border border-border p-6 rounded-xl flex items-center justify-between shadow-soft">
            <div>
               <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Credits Burned</p>
               <h3 className="text-3xl font-bold mt-1.5 text-green-600">{stats?.creditsUsed || 0}</h3>
            </div>
            <Coins className="h-8 w-8 text-green-500/80" />
         </motion.div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-soft overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/50 flex items-center gap-2">
           <Activity className="h-4 w-4 text-muted-foreground" />
           <h3 className="font-medium">Recent Anomaly Logs (Last 50)</h3>
        </div>
        <div className="divide-y divide-border">
           {(!stats?.recentErrors || stats.recentErrors.length === 0) ? (
              <p className="p-6 text-center text-muted-foreground text-sm">No recent anomalies detected.</p>
           ) : (
              stats.recentErrors.map((log: any, i: number) => (
                <div key={i} className="p-4 hover:bg-secondary/20 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                     <span className="font-semibold text-sm text-foreground">{log.event}</span>
                     <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <pre className="text-[10px] text-muted-foreground bg-secondary/40 p-2 rounded mt-1 overflow-x-auto">
                     {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              ))
           )}
        </div>
      </div>
    </div>
  );
}
