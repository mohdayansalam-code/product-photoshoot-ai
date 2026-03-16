import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { standardResponse, ApiError } from "@/lib/apiError";
import { config } from "@/config/env";

export async function GET(req: NextRequest) {
    try {
        const supabaseAdmin = createClient(config.supabase.url, config.supabase.serviceRoleKey);

        const { data: templates, error } = await supabaseAdmin
            .from("templates")
            .select("*")
            .eq("active", true);

        if (error) {
            return standardResponse.success({
                templates: [
                    { id: "studio", name: "Professional Studio", description: "Clean marble background", active: true },
                    { id: "lifestyle", name: "Lifestyle", description: "Realistic environment", active: true },
                    { id: "ecommerce", name: "E-commerce", description: "Pure white background", active: true }
                ]
            });
        }

        return standardResponse.success({
            templates: templates || []
        });

    } catch (error: any) {
        return standardResponse.error(error);
    }
}
