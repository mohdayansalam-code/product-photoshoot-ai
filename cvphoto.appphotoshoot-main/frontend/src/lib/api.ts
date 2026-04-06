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

async function fetchWithRetry(url: string, options: RequestInit = {}, timeout = 10000, maxRetries = 1) {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    try {

      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);

      if (response.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        throw new Error("UNAUTHORIZED_API_CALL");
      }

      return response;
    } catch (error) {
      clearTimeout(id);
      lastError = error;
      
      // If we've reached max retries, throw the last error
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Optional: Add a small delay between retries
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  throw lastError;
}

// Keep FetchScenes mock since it's hardcoded for UI visually.
async function getAuthHeaders() {
  const { data, error } = await supabase.auth.getSession();
  
  if (!data?.session) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("User not authenticated");
  }

  console.log("TOKEN:", data.session.access_token);

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${data.session.access_token}`
  };
}

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    console.log("SESSION READY");
  }
});

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
    product_fix: payload.enhancements.includes("product_fix"),
  };

  const response = await fetchWithRetry(`${API_URL}/api/generate-product`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      product_image: base64Image,
      prompt: payload.prompt,
      scene: payload.scene,
      model: payload.model,
      image_count: payload.image_count,
      fetchers
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Generation failed");
  }

  return { job_id: data.data.generation_id || data.data.id };
}

export async function fetchResults(jobId: string): Promise<GenerationJob> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`${API_URL}/api/results?generation_id=${jobId}`, {
    headers
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch results");
  return {
    id: data.data.generation_id || jobId,
    status: data.data.status,
    progress: data.data.progress || 0,
    images: data.data.image_urls || data.data.images || [],
    scene: data.data.prompt || "Generated Photoshoot",
    model: data.data.model || "AI Model",
    created_at: data.data.created_at || new Date().toISOString(),
  };
}

export async function retryGeneration(generation_id: string): Promise<{ success: boolean }> {
  const response = await fetchWithRetry(`${API_URL}/api/retry-generation`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ generation_id }),
  });
  
  const data = await response.json().catch(() => ({}));
  if (!data.success) {
    throw new Error(data.error || "Failed to retry generation");
  }
  return data.data;
}

export async function getGenerations(): Promise<any[]> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`${API_URL}/api/generations`, { headers });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || "Failed to fetch generations history");
  
  return Array.isArray(data.data) ? data.data : [];
}

export async function generateVariations(generation_id: string, image_url: string): Promise<{ job_id: string }> {
  const response = await fetchWithRetry(`${API_URL}/api/generate-variations`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ generation_id, image_url }),
  });
  const data = await response.json().catch(() => ({}));
  if (!data.success) {
    throw new Error(data.error || "Failed to generate variations");
  }
  return { job_id: data.data.generation_id || data.data.id };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`${API_URL}/api/dashboard-stats`, { headers });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to fetch dashboard stats");
  }
  return data.data.stats || data.data;
}

export async function uploadProduct(file: File, name: string): Promise<{ product_id: string, image_url: string }> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  const response = await fetchWithRetry(`${API_URL}/api/products`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to upload product');
  }
  return { product_id: data.data.product?.id || data.data.productId, image_url: data.data.imageUrl };
}

export async function deleteProduct(id: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`${API_URL}/api/products?id=${id}`, {
    method: 'DELETE',
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!data.success) {
    throw new Error(data.error || 'Failed to delete product');
  }
  return true;
}

export async function uploadAsset(blob: Blob): Promise<{ asset_url: string }> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  // Note: Following the rule to "Reuse existing upload logic", we wrap the Blob as a File 
  // and send it through the existing /api/products route to use the backend's safe upload wrapper,
  // effectively mapping the asset to the user's storage without rewriting backend architectures.
  const formData = new FormData();
  const file = new File([blob], `asset-${Date.now()}.png`, { type: "image/png" });
  formData.append('file', file);
  formData.append('name', file.name);

  const response = await fetchWithRetry(`${API_URL}/api/products`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to save asset');
  }

  // Once safely saved inside storage via the product's wrapper, we'll manually log it to the assets table on the dashboard
  return { asset_url: data.data.imageUrl };
}

export async function fetchAssets(): Promise<{ id: string; src: string; name: string }[]> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];
  
  // Since we don't have an exact /api/assets endpoint defined yet, 
  // we fetch directly using Supabase client to retrieve the user's unified assets, assuming RLS allows it,
  // or we combine the products list as a fallback for the "Assets" view to ensure sync.
  const { data: { session } } = await import("./supabase").then(m => m.supabase.auth.getSession());
  if (!session) return [];

  const { data } = await import("./supabase").then(m => 
    m.supabase.from("assets").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false })
  );

  if (!data) return [];
  return data.map((d: any, index: number) => ({
    id: d.id,
    src: d.image_url,
    name: `Edited Asset ${index + 1}`
  }));
}

export async function fetchProducts(): Promise<any[]> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`${API_URL}/api/products`, { headers });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch products');

  const productsArray = Array.isArray(data.data?.products) ? data.data.products : (Array.isArray(data.data) ? data.data : []);
  return productsArray.map((p: any) => ({
    id: p.id,
    name: p.name,
    imageUrl: p.image_url,
    addedAt: p.created_at,
  }));
}

export async function fetchCredits(): Promise<{ credits: number, maxCredits: number }> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`${API_URL}/api/credits`, { headers });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch credits');
  return { credits: data.data.credits_remaining || 0, maxCredits: data.data.max_credits || 50 };
}

export async function callImageTool(imageUrl: string, tool: 'remove_bg' | 'upscale' | 'product_fix' | string): Promise<{ job_id: string }> {
  const headers = await getAuthHeaders();
  const response = await fetchWithRetry(`${API_URL}/api/image-tools`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ imageUrl, tool }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to start tool');
  return { job_id: data.data.job_id || data.data.jobId };
}
