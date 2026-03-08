// Mock API layer — replace with real endpoints
import sceneLuxury from "@/assets/scene-luxury-skincare.jpg";
import sceneFashion from "@/assets/scene-fashion-editorial.jpg";
import sceneWhite from "@/assets/scene-white-bg.jpg";
import sceneInfluencer from "@/assets/scene-influencer.jpg";
import sceneJewelry from "@/assets/scene-jewelry.jpg";

export interface Scene {
  id: string;
  name: string;
  scene_prompt: string;
  thumbnail: string;
}

export interface GenerationJob {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  images: string[];
  scene: string;
  model: string;
  created_at: string;
}

export const SCENES: Scene[] = [
  { id: "1", name: "Luxury Skincare Studio", scene_prompt: "Luxury skincare studio with marble surface, soft golden lighting, elegant minimalist backdrop", thumbnail: sceneLuxury },
  { id: "2", name: "Fashion Editorial", scene_prompt: "Fashion editorial setup with dramatic lighting, fabric drapes, magazine-style composition", thumbnail: sceneFashion },
  { id: "3", name: "Amazon White Background", scene_prompt: "Pure white seamless background, clean professional ecommerce product photography", thumbnail: sceneWhite },
  { id: "4", name: "Influencer Lifestyle", scene_prompt: "Lifestyle flat lay with natural light, cozy aesthetic, plants and warm tones", thumbnail: sceneInfluencer },
  { id: "5", name: "Jewelry Macro Shot", scene_prompt: "Macro jewelry photography on dark velvet, dramatic spotlight, luxury close-up", thumbnail: sceneJewelry },
];

export const MODELS = [
  { id: "seedream", name: "Seedream 4.5", credits_per_image: 2.5, badge: "Popular" },
  { id: "gemini", name: "Gemini 3.1", credits_per_image: 5, badge: "Premium" },
  { id: "flux", name: "Flux 2 Pro", credits_per_image: 2, badge: "Fast" },
];

// Mock functions
export async function fetchScenes(): Promise<Scene[]> {
  await new Promise((r) => setTimeout(r, 300));
  return SCENES;
}

export async function generateProduct(payload: {
  product_image: File | null;
  scene_prompt: string;
  recommended_model: string;
  image_count: number;
  enhancements: string[];
}): Promise<{ job_id: string }> {
  await new Promise((r) => setTimeout(r, 500));
  return { job_id: `job_${Date.now()}` };
}

export async function fetchResults(jobId: string): Promise<GenerationJob> {
  await new Promise((r) => setTimeout(r, 2000));
  // Return mock completed job with placeholder images
  return {
    id: jobId,
    status: "completed",
    images: Array(4).fill(null).map((_, i) => SCENES[i % SCENES.length].thumbnail),
    scene: "Luxury Skincare Studio",
    model: "Seedream 4.5",
    created_at: new Date().toISOString(),
  };
}

export const MOCK_GENERATIONS: GenerationJob[] = [
  {
    id: "job_1",
    status: "completed",
    images: [sceneLuxury, sceneFashion, sceneWhite, sceneInfluencer],
    scene: "Luxury Skincare Studio",
    model: "Seedream 4.5",
    created_at: "2026-03-07T14:30:00Z",
  },
  {
    id: "job_2",
    status: "completed",
    images: [sceneJewelry, sceneLuxury],
    scene: "Jewelry Macro Shot",
    model: "Gemini 3.1",
    created_at: "2026-03-06T10:15:00Z",
  },
];
