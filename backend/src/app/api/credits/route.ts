import { NextRequest, NextResponse } from "next/server";
import {
    verifyUserWithAuthHeader,
} from "@/lib/creditsAuth.js";
import { creditSystem } from "@/services/creditSystem";

export async function GET(req: NextRequest) {
    try {
        const { user, supabaseAdmin } = await verifyUserWithAuthHeader(
            req.headers.get("authorization")
        );

        if (!user || !supabaseAdmin) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const credits = await creditSystem.getOrCreateCredits(supabaseAdmin, user.id);

        return NextResponse.json({
            credits_remaining: credits.credits_remaining,
        });
    } catch (error) {
        console.error("API ERROR:", error);

        return NextResponse.json(
            { error: "Failed to load credits" },
            { status: 500 }
        );
    }
}
