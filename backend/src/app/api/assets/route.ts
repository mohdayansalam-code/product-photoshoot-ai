import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { config } from "@/config/env";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ success: false, data: [] }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const token = authHeader.split(" ")[1];
        const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);
        
        const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !userData?.user) {
            return new Response(JSON.stringify({ success: false, data: [] }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const { data: assetsData, error: assetsError } = await supabaseAdmin
            .from("assets")
            .select("*")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false });

        if (assetsError) {
            return new Response(JSON.stringify({ success: false, data: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        return new Response(JSON.stringify({
            success: true,
            data: assetsData || []
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch {
        return new Response(JSON.stringify({ success: true, data: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
}
