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



let activeRequests = 0;

function startLoading() {
  activeRequests++;
  if (activeRequests === 1 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("api-start"));
  }
}

function endLoading() {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("api-end"));
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, timeout = 10000, maxRetries = 1) {
  startLoading();
  let lastError: any;
  const requestId = Date.now();
  
  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      
      try {
        const signal = options.signal ? (typeof AbortSignal !== 'undefined' && AbortSignal.any ? AbortSignal.any([options.signal, controller.signal]) : options.signal) : controller.signal;
        
        const response = await fetch(url, {
          ...options,
          signal
        });
        clearTimeout(id);

        if (response.status === 401) {
          console.error("UNAUTHORIZED_API_CALL");
          throw new Error("Unauthorized");
        }

        return response;
      } catch (error) {
        clearTimeout(id);
        lastError = error;
        
        // If we've reached max retries, throw the last error
        if (attempt === maxRetries) {
          console.error(`API error: [ReqID: ${requestId}]`, lastError);
          return new Response(JSON.stringify({ success: false, error: "Network failed" }), { status: 500, headers: { 'Content-Type': 'application/json' } }) as any;
        }
        
        // Optional: Add a small delay between retries
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.error(`API error: [ReqID: ${requestId}]`, lastError);
    return new Response(JSON.stringify({ success: false, error: "Network failed" }), { status: 500, headers: { 'Content-Type': 'application/json' } }) as any;
  } finally {
    endLoading();
  }
}

// Keep FetchScenes mock since it's hardcoded for UI visually.
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession();
  const session = data?.session;

  if (!session?.access_token) {
    throw new Error("User not authenticated");
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${session.access_token}`
  };
}

supabase.auth.onAuthStateChange((event, session) => {
  if (session) {
    // Session is ready
  }
});

export async function fetchScenes(): Promise<Scene[]> {
  await new Promise((r) => setTimeout(r, 300));
  return SCENES;
}

export async function generateProduct(payload: {
  product_image: File | null;
  product_url?: string;
  background_image?: File | null;
  model_image?: File | null;
  user_prompt: string;
  generation_type: string;
  scene?: string;
  ai_model?: string;
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

  let base64Background = "";
  if (payload.background_image) {
    base64Background = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(payload.background_image as File);
    });
  }

  let base64Model = "";
  if (payload.model_image) {
    base64Model = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(payload.model_image as File);
    });
  }

  const fetchers = {
    remove_background: payload.enhancements.includes("remove_bg"),
    white_background: payload.enhancements.includes("white_bg"),
    super_resolution: payload.enhancements.includes("super_res"),
    upscale_v4: payload.enhancements.includes("upscale_v4"),
    product_fix: payload.enhancements.includes("product_fix"),
  };

  const response = await fetchWithRetry(`/api/generate-product`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      product_image: base64Image,
      background_image: base64Background || null,
      model_image: base64Model || null,
      user_prompt: payload.user_prompt,
      generation_type: payload.generation_type,
      scene: payload.scene,
      model: payload.ai_model,
      image_count: payload.image_count,
      fetchers
    }),
  });

  if (!response.ok) { const errText = await response.text(); console.error("API ERROR RAW:", errText); throw new Error("API failed"); } const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON response"); }
  if (!data || !data.success) {
    console.error(data.error || "Generation failed");
    return { job_id: "" };
  }

  return { job_id: data.data.generation_id || data.data.id };
}

export async function fetchResults(jobId: string): Promise<GenerationJob> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`/api/results?generation_id=${jobId}`, {
    headers
  });
  if (!response.ok) { const errText = await response.text(); console.error("API ERROR RAW:", errText); throw new Error("API failed"); } const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON response"); }
  if (!data || !data.success) {
    console.error(data.error || "Failed to fetch results");
    return { id: jobId, status: "failed", images: [], scene: "", model: "", created_at: new Date().toISOString() };
  }
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
  const response = await fetchWithRetry(`/api/retry-generation`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ generation_id }),
  });
  
  const data = await response.json().catch(() => ({}));
  if (!data || !data.success) {
    console.error(data.error || "Failed to retry generation");
    return { success: false };
  }
  return data.data;
}

export async function getGenerations(signal?: AbortSignal): Promise<any[]> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`/api/generations`, { headers, signal });
  if (!response.ok) { const errText = await response.text(); console.error("API ERROR RAW:", errText); throw new Error("API failed"); } const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON response"); }
  if (!data || !data.success) {
    console.error(data.error || "Failed to fetch generations history");
    return [];
  }
  
  return Array.isArray(data.data) ? data.data : [];
}

export async function generateVariations(generation_id: string, image_url: string): Promise<{ job_id: string }> {
  const response = await fetchWithRetry(`/api/generate-variations`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({ generation_id, image_url }),
  });
  const data = await response.json().catch(() => ({}));
  if (!data || !data.success) {
    console.error(data.error || "Failed to generate variations");
    return { job_id: "" };
  }
  return { job_id: data.data.generation_id || data.data.id };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`/api/dashboard-stats`, { headers });
  if (!response.ok) { const errText = await response.text(); console.error("API ERROR RAW:", errText); throw new Error("API failed"); } const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON response"); }
  if (!data || !data.success) {
    console.error(data.error || "Failed to fetch dashboard stats");
    return { credits: 0, images_generated: 0, active_projects: 0, storage_used: "0 MB" };
  }
  return data.data.stats || data.data;
}

export async function uploadProduct(file: File, name: string): Promise<{ product_id: string, image_url: string }> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', name);

  const response = await fetchWithRetry(`/api/products`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) { const errText = await response.text(); console.error("API ERROR RAW:", errText); throw new Error("API failed"); } const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON response"); }
  if (!data || !data.success) {
    console.error(data.error || 'Failed to upload product');
    return { product_id: "", image_url: "" };
  }
  return { product_id: data.data.product?.id || data.data.productId, image_url: data.data.imageUrl };
}

export async function deleteProduct(id: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  delete headers["Content-Type"];

  const response = await fetchWithRetry(`/api/products?id=${id}`, {
    method: 'DELETE',
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!data || !data.success) {
    console.error(data.error || 'Failed to delete product');
    return false;
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

  const response = await fetchWithRetry(`/api/products`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) { const errText = await response.text(); console.error("API ERROR RAW:", errText); throw new Error("API failed"); } const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON response"); }
  if (!data || !data.success) {
    console.error(data.error || 'Failed to save asset');
    return { asset_url: "" };
  }

  // Once safely saved inside storage via the product's wrapper, we'll manually log it to the assets table on the dashboard
  return { asset_url: data.data.imageUrl };
}




export async function callImageTool(imageUrl: string, tool: 'remove_bg' | 'upscale' | 'product_fix' | string): Promise<{ job_id: string }> {
  const headers = await getAuthHeaders();
  const response = await fetchWithRetry(`/api/tools/${tool}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ imageUrl, tool }),
  });
  if (!response.ok) { const errText = await response.text(); console.error("API ERROR RAW:", errText); throw new Error("API failed"); } const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON response"); }
  if (!data || !data.success) {
    console.error(data.error || 'Failed to start tool');
    return { job_id: "" };
  }
  return { job_id: data.data.job_id || data.data.jobId };
}
