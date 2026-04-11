import { motion } from "framer-motion";
import { Coins, TrendingDown, TrendingUp, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useEffect, useState } from "react";
import { getGenerations } from "@/lib/api";
import { format, parseISO, subDays, isSameDay } from "date-fns";
import { supabase } from "@/lib/supabase";

export default function CreditsPage() {
  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) return;

        const [res, genData] = await Promise.all([
          fetch("/api/credits", {
            headers: { Authorization: `Bearer ${sessionData.session.access_token}` }
          }),
          getGenerations().catch(()=>[])
        ]);
        
        const credData = await res.json();
        setCredits(credData.credits_remaining);
        setTransactions(credData.transactions || []);
        setGenerations(genData || []);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const weeklyUsage = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(new Date(), 6 - i);
    const dayGens = generations.filter(g => isSameDay(parseISO(g.created_at || new Date().toISOString()), d));
    const creditsUsed = dayGens.reduce((acc, curr) => acc + (curr.credits_used || 0), 0);
    return { day: format(d, "EEE"), credits: creditsUsed };
  });

  const categoryUsage = [
    { category: "Photoshoots", color: "hsl(217, 91%, 60%)", credits: generations.reduce((acc, c) => acc + (c.credits_used || 0), 0) },
    { category: "Refunds", color: "hsl(230, 91%, 65%)", credits: transactions.filter(t => t.type === 'refund').reduce((acc, c) => acc + (c.amount || 0), 0) },
  ];

  if (loading) {
    return (
       <div className="flex justify-center p-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
       </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-semibold text-foreground">
        Credits
      </motion.h1>

      {/* Balance card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        whileHover={{ y: -2 }}
        className="rounded-xl border border-border bg-card shadow-card p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <Coins className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold text-foreground">{credits} <span className="text-base font-normal text-muted-foreground">credits</span></p>
          </div>
        </div>
      </motion.div>

      {/* Usage Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4"
        >
          <h2 className="font-medium text-foreground text-sm">Credits Used This Week (Generated)</h2>
          {generations.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No generations yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyUsage}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)", boxShadow: "0 4px 16px -2px hsl(220 20% 10% / 0.06)" }}
                  cursor={{ fill: "hsl(220, 14%, 96%)" }}
                />
                <Bar dataKey="credits" radius={[6, 6, 0, 0]} fill="hsl(217, 91%, 60%)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card shadow-soft p-5 space-y-4"
        >
          <h2 className="font-medium text-foreground text-sm">Usage by Category</h2>
          {generations.length === 0 && transactions.length === 0 ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">No usage history yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryUsage.filter(c => c.credits > 0)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(220, 10%, 46%)" }} width={90} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(220, 13%, 91%)", boxShadow: "0 4px 16px -2px hsl(220 20% 10% / 0.06)" }}
                />
                <Bar dataKey="credits" radius={[0, 6, 6, 0]}>
                  {categoryUsage.filter(c => c.credits > 0).map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Usage History */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-xl border border-border bg-card shadow-soft"
      >
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-foreground">Usage Ledger</h2>
        </div>
        <div className="divide-y divide-border">
          {transactions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">No history yet</div>
          ) : transactions.map((item: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                {item.amount > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(item.created_at || new Date().toISOString()), "MMM d, yyyy h:mm a")}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${item.amount > 0 ? "text-green-600" : "text-foreground"}`}>
                {item.amount > 0 ? "+" : ""}{item.amount}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
