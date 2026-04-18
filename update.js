const fs = require('fs');
const path = 'c:/Users/Acer/Downloads/SAAS/cvphoto.appphotoshoot-main/cvphoto.appphotoshoot-main/frontend/src/components/auth/AuthCard.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(/const handleEmailAuth[\s\S]*?\} finally \{\s*setIsLoadingEmail\(false\);\s*\}\s*\};/m, `const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Error", description: "Email and password are required.", variant: "destructive" });
      return;
    }

    try {
      setIsLoadingEmail(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
        }
      });
      
      if (error && error.message.includes("already registered")) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
      } else if (error) {
        throw error;
      }
      
      window.location.replace("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive"
      });
    } finally {
      setIsLoadingEmail(false);
    }
  };`);

c = c.replace(/\{\/\* Email form \*\/\}[\s\S]*?<\/form>/m, `{/* Email form */}
        <form
          onSubmit={handleEmailAuth}
          className="space-y-4"
        >
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoadingGoogle || isLoadingEmail}
            className="rounded-xl border-[hsl(217,32%,17%)] bg-[hsl(217,32%,10%)] py-6 text-white placeholder:text-[hsl(215,20%,40%)] focus-visible:ring-primary"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoadingGoogle || isLoadingEmail}
            className="rounded-xl border-[hsl(217,32%,17%)] bg-[hsl(217,32%,10%)] py-6 text-white placeholder:text-[hsl(215,20%,40%)] focus-visible:ring-primary"
          />
          <Button
            type="submit"
            disabled={isLoadingGoogle || isLoadingEmail || !email || !password}
            className="w-full rounded-xl py-6 text-sm font-semibold gradient-primary hover:opacity-90"
          >
            {isLoadingEmail ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
            Sign In / Sign Up
          </Button>
        </form>`);

fs.writeFileSync(path, c);
console.log('Patched');
