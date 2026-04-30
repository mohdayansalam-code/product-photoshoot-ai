import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2, Zap, Calendar, User, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<any>(null);
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        setEmail(session.user.email || "");

        const API_URL = import.meta.env.VITE_API_URL || "https://product-photoshoot-ai.onrender.com";
        const res = await fetch(`${API_URL}/api/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        const data = await res.json();
        setUsageData(data);
      } catch (err) {
        console.error("Failed to load settings", err);
        toast({ title: "Failed to load settings", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [toast]);

  if (loading) {
    return (
       <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
       </div>
    );
  }

  const usagePercent = usageData ? (usageData.used / usageData.limit) * 100 : 0;

  // Format next reset date (first day of the next month)
  const getNextResetDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <Settings className="h-6 w-6 text-gray-900" />
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
        </div>
        <p className="text-sm text-gray-500">Manage your account and view usage limits.</p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.1 }} 
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="p-6 md:p-8 bg-gray-50/50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-500" /> Account Profile
          </h2>
        </div>
        <div className="p-6 md:p-8">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500">Email Address</p>
            <p className="text-base text-gray-900 font-medium">{email}</p>
          </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 16 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2 }} 
        className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <div className="p-6 md:p-8 bg-gray-50/50 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" /> Usage & Plan
          </h2>
          <div className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-full border border-gray-200">
            {usageData?.plan || "Free"} Plan
          </div>
        </div>
        
        <div className="p-6 md:p-8 space-y-6">
          <div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm font-medium text-gray-700">Monthly Generation Limit</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">{usageData?.used || 0}</span>
                <span className="text-gray-500 font-medium"> / {usageData?.limit || 10}</span>
              </div>
            </div>
            
            <Progress value={usagePercent} className="h-3 bg-gray-100" indicatorClassName={usagePercent >= 100 ? "bg-red-500" : "bg-blue-500"} />
            
            {usagePercent >= 100 && (
              <p className="text-xs text-red-500 mt-2 font-medium">You have reached your monthly limit.</p>
            )}
          </div>

          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-100">
              <Calendar className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Next Reset</p>
              <p className="text-sm font-semibold text-gray-900">{getNextResetDate()}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
