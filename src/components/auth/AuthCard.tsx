import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Camera } from "lucide-react";

export function AuthCard() {
  const [email, setEmail] = useState("");

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[hsl(222,47%,6%)] px-6 py-12 lg:min-h-0">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute left-6 top-6 flex items-center gap-2 lg:left-auto lg:right-auto"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
          <Camera className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold text-white">AI Photoshoot</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Get Started
          </h1>
          <p className="mt-2 text-sm text-[hsl(215,20%,65%)]">
            Create studio-quality product photos in seconds.
          </p>
        </div>

        {/* Google button */}
        <Button
          variant="outline"
          className="w-full gap-3 rounded-xl border-[hsl(217,32%,20%)] bg-[hsl(217,32%,12%)] py-6 text-sm font-medium text-white hover:bg-[hsl(217,32%,16%)]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <Separator className="flex-1 bg-[hsl(217,32%,17%)]" />
          <span className="text-xs text-[hsl(215,20%,50%)]">or</span>
          <Separator className="flex-1 bg-[hsl(217,32%,17%)]" />
        </div>

        {/* Email form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
          }}
          className="space-y-4"
        >
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl border-[hsl(217,32%,17%)] bg-[hsl(217,32%,10%)] py-6 text-white placeholder:text-[hsl(215,20%,40%)] focus-visible:ring-primary"
          />
          <Button
            type="submit"
            className="w-full rounded-xl py-6 text-sm font-semibold gradient-primary hover:opacity-90"
          >
            Continue with email
          </Button>
        </form>

        {/* Footer link */}
        <p className="text-center text-sm text-[hsl(215,20%,50%)]">
          New here?{" "}
          <Link
            to="/auth"
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
