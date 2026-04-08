import { NextResponse } from "next/server";
import { standardResponse } from "@/lib/apiError";

interface Scene {
    id: string;
    name: string;
    category: string;
    prompt: string;
    recommended_model: string;
    recommended_resolution: "1k" | "2k" | "4k";
}

const SCENES: Scene[] = [
    {
        id: "luxury-skincare-studio",
        name: "Luxury Skincare Studio",
        category: "cosmetics",
        prompt: "luxury skincare product photography, glossy white studio background, soft beauty lighting, premium cosmetic campaign, professional studio shoot, ultra realistic",
        recommended_model: "seedream-4.5",
        recommended_resolution: "2k"
    },
    {
        id: "fashion-editorial",
        name: "Fashion Editorial Shoot",
        category: "fashion",
        prompt: "high fashion editorial photoshoot, confident model pose, dramatic lighting, vogue magazine style photography, cinematic composition",
        recommended_model: "gemini-3.1",
        recommended_resolution: "4k"
    },
    {
        id: "amazon-white-background",
        name: "Amazon White Background",
        category: "ecommerce",
        prompt: "clean ecommerce product photography, pure white background, soft shadow under product, centered product shot, amazon listing style",
        recommended_model: "flux-2-pro",
        recommended_resolution: "2k"
    },
    {
        id: "influencer-lifestyle",
        name: "Influencer Lifestyle",
        category: "social",
        prompt: "instagram lifestyle product photo, influencer holding product, natural lighting, modern aesthetic background, social media advertising style",
        recommended_model: "gemini-3.1",
        recommended_resolution: "2k"
    },
    {
        id: "jewelry-macro",
        name: "Jewelry Macro Shot",
        category: "jewelry",
        prompt: "luxury jewelry macro photography, gemstone reflections, dramatic lighting, premium fashion campaign style, high detail",
        recommended_model: "seedream-4.5",
        recommended_resolution: "4k"
    }
];

export async function GET() {
    return standardResponse.success({ scenes: SCENES });
}
