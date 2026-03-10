import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env variables");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createGenerationsTable() {
    console.log("Creating generations table...");

    // Since we cannot run raw DDL via standard Supabase JS client without RPC or postgres connection, 
    // and we don't have the direct postgres connection string, we will provide the SQL 
    // command for the user to run in their Supabase SQL editor, or just let them know.
    // Wait, we can try to use standard REST API if there's an RPC or if postgres string is present.
    // Actually, standard practice for these SaaS kits is dropping a SQL script.
    console.log(`
Please run the following SQL command in your Supabase SQL Editor:
  
CREATE TABLE IF NOT EXISTS public.generations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users,
    input_image text NOT NULL,
    generated_images jsonb NOT NULL,
    template text NOT NULL,
    credits_used integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- Create Policy for users to read their own generations
CREATE POLICY "Users can view own generations" ON public.generations
    FOR SELECT USING (auth.uid() = user_id);
    
-- ==========================================
-- CREATE user_credits TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_credits (
    user_id uuid PRIMARY KEY REFERENCES auth.users,
    credits_remaining integer NOT NULL DEFAULT 50,
    plan_type text NOT NULL DEFAULT 'starter',
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Create Policy for users to read their own credits
CREATE POLICY "Users can view own credits" ON public.user_credits
    FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- CREATE generation_rate_limit TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.generation_rate_limit (
    user_id uuid PRIMARY KEY REFERENCES auth.users,
    request_count integer NOT NULL DEFAULT 1,
    window_start timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generation_rate_limit ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- CREATE generation_jobs TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.generation_jobs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users,
    input_image text NOT NULL,
    template text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    result_images jsonb,
    created_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

-- Create Policy for users to read their own jobs
CREATE POLICY "Users can view own jobs" ON public.generation_jobs
    FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- CREATE SCHEMA RELOAD FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.reload_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

  `);

    // Simulate an error check, as direct DDL execution isn't supported via client.rpc for arbitrary SQL.
    // The user must manually run the SQL above in the Supabase SQL Editor.
    const error = null; // Assume no error for the printed SQL

    if (error) {
        console.error("Error creating tables:", error);
    } else {
        console.log("Tables SQL printed successfully. Please run it in your Supabase SQL Editor.");

        // Attempt to invoke the schema reload immediately
        // This RPC call will only work if the `reload_schema_cache` function
        // has been created by the user running the SQL above.
        const { error: reloadError } = await supabase.rpc('reload_schema_cache');
        if (reloadError) {
            console.warn("Schema reload RPC failed (might not be supported on this tier, or function not yet created):", reloadError.message);
        } else {
            console.log("Schema cache reloaded successfully.");
        }
    }
}

initDB();
