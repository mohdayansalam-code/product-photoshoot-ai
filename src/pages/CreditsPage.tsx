import { Coins, TrendingDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const usageHistory = [
  { date: "Mar 7, 2026", action: "Photoshoot Generation", credits: -10 },
  { date: "Mar 6, 2026", action: "Super Resolution", credits: -3 },
  { date: "Mar 5, 2026", action: "Credits Purchased", credits: 200 },
  { date: "Mar 4, 2026", action: "Photoshoot Generation", credits: -20 },
  { date: "Mar 3, 2026", action: "Background Removal", credits: -2 },
];

export default function CreditsPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-foreground">Credits</h1>

      <div className="rounded-xl border border-border bg-card shadow-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
            <Coins className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold text-foreground">120 <span className="text-base font-normal text-muted-foreground">credits</span></p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>120 remaining</span>
            <span>200 purchased</span>
          </div>
          <Progress value={60} className="h-2" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-soft">
        <div className="p-4 border-b border-border">
          <h2 className="font-medium text-foreground">Usage History</h2>
        </div>
        <div className="divide-y divide-border">
          {usageHistory.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <TrendingDown className={`h-4 w-4 ${item.credits > 0 ? "text-green-500 rotate-180" : "text-destructive"}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
              </div>
              <span className={`text-sm font-semibold ${item.credits > 0 ? "text-green-600" : "text-foreground"}`}>
                {item.credits > 0 ? "+" : ""}{item.credits}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
