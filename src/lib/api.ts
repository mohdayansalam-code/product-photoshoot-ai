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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Keep FetchScenes mock since it's hardcoded for UI visually.
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

  let base64Image = "";
  if (payload.product_image) {
    base64Image = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(payload.product_image as File);
    });
  }

  const fetchers = {
    remove_background: payload.enhancements.includes("remove_bg"),
    white_background: payload.enhancements.includes("white_bg"),
    super_resolution: payload.enhancements.includes("super_res"),
    upscale_v4: payload.enhancements.includes("upscale_v4"),
  };

  const response = await fetch(`${API_URL}/api/generate-product`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageUrl: base64Image,
      prompt: payload.scene_prompt,
      model: payload.recommended_model,
      image_count: payload.image_count,
      lock_style: true,
      fetchers
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Generation failed");
  }

  const data = await response.json();
  return { job_id: data.generation_id || data.jobId };
}

export async function fetchResults(jobId: string): Promise<GenerationJob> {
  const response = await fetch(`${API_URL}/api/results?generation_id=${jobId}`);
  if (!response.ok) throw new Error("Failed to fetch results");
  const data = await response.json();
  return {
    id: jobId,
    status: data.status,
    images: data.images || [],
    scene: "Generated Scene",
    model: "AI Model",
    created_at: new Date().toISOString(),
  };
}

export const MOCK_GENERATIONS: GenerationJob[] = [];

export async function uploadProduct(file: File, name: string): Promise<{ product_id: string, image_url: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  const response = await fetch("/api/products", {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload product');
  }

  const data = await response.json();
  return { product_id: data.product.id, image_url: data.imageUrl };
}

export async function fetchProducts(): Promise<any[]> {
  const response = await fetch("/api/products");
  if (!response.ok) throw new Error('Failed to fetch products');
  const data = await response.json();
  
  return data.products.map((p: any) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.image_url,
    addedAt: p.created_at,
  }));
}

export async function fetchCredits(): Promise<{ credits: number, maxCredits: number }> {
  const response = await fetch("/api/credits");
  if (!response.ok) throw new Error('Failed to fetch credits');
  const data = await response.json();
  return { credits: data.credits || 0, maxCredits: data.max_credits || 50 };
}

export async function callImageTool(imageUrl: string, tool: 'remove_bg' | 'upscale'): Promise<{ job_id: string }> {
  const response = await fetch("/api/image-tools", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl, tool }),
  });
  if (!response.ok) throw new Error('Failed to start tool');
  const data = await response.json();
  return { job_id: data.job_id || data.jobId };
}
