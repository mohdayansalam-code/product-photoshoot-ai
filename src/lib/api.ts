import sceneLuxury from "@/assets/scene-luxury-skincare.jpg";
import sceneFashion from "@/assets/scene-fashion-editorial.jpg";
import sceneWhite from "@/assets/scene-white-bg.jpg";
import sceneInfluencer from "@/assets/scene-influencer.jpg";
import sceneJewelry from "@/assets/scene-jewelry.jpg";
import { supabase } from "@/lib/supabase";

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Keep FetchScenes mock since it's hardcoded for UI visually.
export async function fetchScenes(): Promise<Scene[]> {
  await new Promise((r) => setTimeout(r, 300));
  return SCENES;
}

export async function generateProduct(payload: {
  product_image: File | null;
  product_url?: string;
  prompt: string;
  scene?: string;
  model?: string;
  image_count: number;
  enhancements: string[];
}): Promise<{ job_id: string }> {

  let base64Image = payload.product_url || "";
  if (payload.product_image && !payload.product_url) {
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

  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(`${API_URL}/api/generate-product`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({
      product_image: base64Image,
      prompt: payload.prompt,
      scene: payload.scene,
      model: payload.model,
      image_count: payload.image_count,
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
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}/api/results?generation_id=${jobId}`, {
    headers: {
      "Authorization": `Bearer ${session?.access_token}`
    }
  });
  if (!response.ok) throw new Error("Failed to fetch results");
  const data = await response.json();
  return {
    id: data.generation_id || jobId,
    status: data.status,
    progress: data.progress || 0,
    images: data.image_urls || data.images || [],
    scene: data.prompt || "Generated Photoshoot",
    model: data.model || "AI Model",
    created_at: data.created_at || new Date().toISOString(),
  };
}

export async function retryGeneration(generation_id: string): Promise<{ success: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}/api/retry-generation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ generation_id }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to retry generation");
  }
  return await response.json();
}

export async function getGenerations(): Promise<any[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}/api/generations`, {
    headers: {
      "Authorization": `Bearer ${session?.access_token}`
    }
  });
  if (!response.ok) throw new Error("Failed to fetch generations history");
  return await response.json();
}

export async function generateVariations(generation_id: string, image_url: string): Promise<{ job_id: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}/api/generate-variations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ generation_id, image_url }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate variations");
  }
  const data = await response.json();
  return { job_id: data.generation_id };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}/api/dashboard-stats`, {
    headers: {
      "Authorization": `Bearer ${session?.access_token}`
    }
  });
  if (!response.ok) throw new Error("Failed to fetch dashboard stats");
  const data = await response.json();
  return data.stats;
}

export async function uploadProduct(file: File, name: string): Promise<{ product_id: string, image_url: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  const response = await fetch(`${API_URL}/api/products`, {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${session?.access_token}`
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload product');
  }

  const data = await response.json();
  return { product_id: data.product.id, image_url: data.imageUrl };
}

export async function fetchProducts(): Promise<any[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}/api/products`, {
    headers: {
      "Authorization": `Bearer ${session?.access_token}`
    }
  });
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
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}/api/credits`, {
    headers: {
      "Authorization": `Bearer ${session?.access_token}`
    }
  });
  if (!response.ok) throw new Error('Failed to fetch credits');
  const data = await response.json();
  return { credits: data.credits_remaining || 0, maxCredits: data.max_credits || 50 };
}

export async function callImageTool(imageUrl: string, tool: 'remove_bg' | 'upscale'): Promise<{ job_id: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_URL}/api/image-tools`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`
    },
    body: JSON.stringify({ imageUrl, tool }),
  });
  if (!response.ok) throw new Error('Failed to start tool');
  const data = await response.json();
  return { job_id: data.job_id || data.jobId };
}
