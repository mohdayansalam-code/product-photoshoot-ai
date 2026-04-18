import { NextRequest } from "next/server";
import { getSupabaseAdminClient, requireAuthenticatedUser } from "@/lib/routeAuth";

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ success: false, data: [] }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const { user } = await requireAuthenticatedUser(authHeader);
        const supabaseAdmin = getSupabaseAdminClient();

        if (!user) {
            return new Response(JSON.stringify({ success: false, data: [] }), { status: 401, headers: { "Content-Type": "application/json" } });
        }

        const { data: assetsData, error: assetsError } = await supabaseAdmin
            .from("assets")
            .select("*")
            .eq("user_id", user.id)
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
