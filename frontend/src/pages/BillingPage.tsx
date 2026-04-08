import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  { name: "Starter", price: 19, credits: 200, features: ["200 credits/mo", "5 scene presets", "Basic models", "Email support"] },
  { name: "Growth", price: 49, credits: 600, popular: true, features: ["600 credits/mo", "All scene presets", "All AI models", "Priority support", "Bulk generation"] },
  { name: "Pro", price: 99, credits: 1500, features: ["1,500 credits/mo", "All scene presets", "All AI models", "Dedicated support", "API access", "Custom scenes"] },
];

export default function BillingPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
        <p className="text-muted-foreground mt-1">Choose the plan that fits your needs</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4 }}
            className={`rounded-xl border bg-card p-6 space-y-5 relative ${
              plan.popular ? "border-primary shadow-card ring-1 ring-primary/20" : "border-border shadow-soft"
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full gradient-primary text-primary-foreground">
                Most Popular
              </span>
            )}
            <div>
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <div className="mt-2">
                <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{plan.credits} credits</p>
            </div>
            <ul className="space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <Button
              className={`w-full ${plan.popular ? "gradient-primary text-primary-foreground hover:opacity-90" : ""}`}
              variant={plan.popular ? "default" : "outline"}
            >
              {plan.popular ? "Upgrade Now" : "Get Started"}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
