import sceneLuxury from "@/assets/scene-luxury-skincare.jpg";
import sceneFashion from "@/assets/scene-fashion-editorial.jpg";
import sceneWhite from "@/assets/scene-white-bg.jpg";
import sceneInfluencer from "@/assets/scene-influencer.jpg";
import sceneJewelry from "@/assets/scene-jewelry.jpg";

export const DEFAULT_CREDITS = {
  images_used: 0,
  monthly_limit: 10
};

export const API_BASE_URL = "";

export interface DashboardStats {
  credits: number;
  images_generated: number;
  active_projects: number;
  storage_used: string;
}

export interface Scene {
  id: string;
  name: string;
  scene_prompt: string;
  thumbnail: string;
}

export interface GenerationJob {
  id: string;
  status: "queued" | "processing" | "generating" | "enhancing" | "completed" | "failed";
  progress?: number;
  image_count?: number;
  credits_used?: number;
  images: string[];
  scene: string;
  model: string;
  created_at: string;
}

export interface ProductRecord {
  id: string;
  name: string;
  imageUrl: string;
  addedAt: string;
}

export interface AssetRecord {
  id: string;
  src: string;
  name: string;
  createdAt?: string;
}

export const SCENES: Scene[] = [
  { id: "luxury-skincare-studio", name: "Luxury Skincare Studio", scene_prompt: "luxury-skincare-studio", thumbnail: sceneLuxury },
  { id: "amazon-white-background", name: "Amazon White Background", scene_prompt: "amazon-white-background", thumbnail: sceneWhite },
  { id: "jewelry-macro-shot", name: "Jewelry Macro Shot", scene_prompt: "jewelry-macro-shot", thumbnail: sceneJewelry },
];

export const MODELS = [
  { id: "auto", name: "Auto (Smart Routing)", credits_per_image: 0, badge: "Recommended" },
  { id: "seedream-5-lite", name: "Seedream 5 Lite", credits_per_image: 3, badge: "Balanced" },
  { id: "seedream-4.5", name: "Seedream 4.5", credits_per_image: 2.5, badge: "Popular" },
  { id: "gemini-3.1", name: "Gemini 3.1", credits_per_image: 5, badge: "Premium" },
  { id: "flux-2-pro", name: "Flux 2 Pro", credits_per_image: 2, badge: "Fast" },
];

export async function getAccessToken(): Promise<string | null> {
  return null;
}

export async function fetchScenes(): Promise<Scene[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return SCENES;
}

export async function getGenerations(): Promise<any[]> {
  return [];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return { credits: DEFAULT_CREDITS.monthly_limit - DEFAULT_CREDITS.images_used, images_generated: 0, active_projects: 0, storage_used: "0 MB" };
}

export async function fetchAssets(): Promise<AssetRecord[]> {
  return [];
}

export async function fetchProducts(): Promise<ProductRecord[]> {
  return [];
}

export async function retryGeneration(id: string) { return null; }
export async function uploadAsset(b: Blob) { return null; }
export async function uploadProduct(b: any, n: string) { return null; }
export async function callImageTool(u: string, t: string) { return null; }
export async function deleteProduct(id: string) { return null; }
