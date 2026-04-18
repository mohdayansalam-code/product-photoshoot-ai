import sceneLuxury from "@/assets/scene-luxury-skincare.jpg";
import sceneFashion from "@/assets/scene-fashion-editorial.jpg";
import sceneWhite from "@/assets/scene-white-bg.jpg";
import sceneInfluencer from "@/assets/scene-influencer.jpg";
import sceneJewelry from "@/assets/scene-jewelry.jpg";


const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:3000" : "");

export const API_BASE_URL = configuredApiBaseUrl.replace(/\/$/, "");

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

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string | null;
}

interface JsonRequestResult<T> {
  data: T | null;
  error: string | null;
  status: number;
}

interface RequestJsonOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  requireAuth?: boolean;
  timeout?: number;
  maxRetries?: number;
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

function buildApiUrl(path: string) {
  if (!API_BASE_URL) {
    throw new Error("Missing VITE_API_BASE_URL configuration");
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function looksLikeJson(rawText: string) {
  const trimmed = rawText.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function isApiEnvelope<T>(payload: unknown): payload is ApiEnvelope<T> {
  return typeof payload === "object" && payload !== null && "success" in payload;
}

function extractErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const candidate = payload.error;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return fallback;
}

function unwrapPayload<T>(payload: unknown): T | null {
  if (isApiEnvelope<T>(payload)) {
    return payload.success ? (payload.data ?? null) : null;
  }

  return (payload as T) ?? null;
}

async function fetchWithRetry(url: string, options: RequestInit = {}, timeout = 10000, maxRetries = 1) {
  startLoading();
  let lastError: unknown;
  const requestId = Date.now();

  try {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const signal = options.signal
          ? (typeof AbortSignal !== "undefined" && AbortSignal.any
              ? AbortSignal.any([options.signal, controller.signal])
              : options.signal)
          : controller.signal;

        const response = await fetch(url, {
          ...options,
          signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;

        if (attempt === maxRetries) {
          console.error(`API error: [ReqID: ${requestId}]`, lastError);
          return new Response(
            JSON.stringify({ error: "Network failed" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.error(`API error: [ReqID: ${requestId}]`, lastError);
    return new Response(
      JSON.stringify({ error: "Network failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    endLoading();
  }
}

async function readJsonResponse<T>(response: Response) {
  const rawText = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!rawText) {
    return { data: null as T | null, error: null };
  }

  const shouldParse = contentType.toLowerCase().includes("application/json") || looksLikeJson(rawText);

  if (!shouldParse) {
    console.error("Non-JSON response received from API", {
      url: response.url,
      status: response.status,
      contentType,
      bodyPreview: rawText.slice(0, 200),
    });
    return { data: null as T | null, error: "Non-JSON response from API" };
  }

  try {
    return {
      data: JSON.parse(rawText) as T,
      error: null,
    };
  } catch (error) {
    console.error("Invalid JSON response received from API", {
      url: response.url,
      status: response.status,
      bodyPreview: rawText.slice(0, 200),
      error,
    });
    return { data: null as T | null, error: "Invalid JSON response" };
  }
}

export async function getAccessToken(): Promise<string | null> {
  return null;
}

async function requestJson<T>(path: string, options: RequestJsonOptions = {}): Promise<JsonRequestResult<T>> {
  const {
    headers: customHeaders = {},
    requireAuth = false,
    timeout = 10000,
    maxRetries = 1,
    body,
    ...fetchOptions
  } = options;

  const headers: Record<string, string> = { ...customHeaders };
  
  // Auth logic stripped as requested

  if (body && !(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let url: string;
  try {
    url = buildApiUrl(path);
  } catch (error) {
    console.error(`Skipping request for ${path}: invalid API base URL`, error);
    return { data: null, error: "API base URL is not configured", status: 500 };
  }

  const response = await fetchWithRetry(
    url,
    {
      ...fetchOptions,
      body,
      headers,
    },
    timeout,
    maxRetries
  );

  const { data, error } = await readJsonResponse<T>(response);

  if (!response.ok) {
    return {
      data: null,
      error: extractErrorMessage(data, error || `Request failed with status ${response.status}`),
      status: response.status,
    };
  }

  if (!data) {
    return {
      data: null,
      error: error || "Empty response from API",
      status: response.status,
    };
  }

  return {
    data,
    error: null,
    status: response.status,
  };
}

export async function fetchScenes(): Promise<Scene[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return SCENES;
}

export async function getCredits(): Promise<{ credits_remaining: number } | null> {
  const result = await requestJson<{ credits: number }>("/api/credits", {
    requireAuth: false,
    maxRetries: 0,
  });

  if (result.error || !result.data || typeof result.data.credits !== "number") {
    console.error("Failed to fetch credits", result.error || result.data);
    return null;
  }

  return {
    credits_remaining: result.data.credits,
  };
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
}): Promise<{ job_id: string; image_url: string }> {
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

  const result = await requestJson<ApiEnvelope<{ generation_id?: string; id?: string }>>(
    "/api/generate-product",
    {
      method: "POST",
      requireAuth: true,
      body: JSON.stringify({
        product_image: base64Image,
        background_image: base64Background || null,
        model_image: base64Model || null,
        user_prompt: payload.user_prompt,
        generation_type: payload.generation_type,
        scene: payload.scene,
        model: payload.ai_model,
        image_count: payload.image_count,
        fetchers,
      }),
    }
  );

  if (result.error || !result.data) {
    throw new Error(result.error || "Generation failed");
  }

  const data = unwrapPayload<any>(result.data);
  if (!data) {
    throw new Error(extractErrorMessage(result.data, "Generation failed"));
  }

  const jobId = data.generation_id || data.id || "gen_" + Date.now();
  const image_url = data.image_url || data.images?.[0] || "https://via.placeholder.com/512?text=Generated+Image";
  
  return { job_id: jobId, image_url };
}

export async function fetchResults(jobId: string): Promise<GenerationJob> {
  const result = await requestJson<ApiEnvelope<any>>(`/api/results?generation_id=${jobId}`, {
    requireAuth: true,
  });

  if (result.error || !result.data) {
    console.error("Failed to fetch results", result.error);
    return { id: jobId, status: "failed", images: [], scene: "", model: "", created_at: new Date().toISOString() };
  }

  const data = unwrapPayload<any>(result.data);
  if (!data) {
    console.error(extractErrorMessage(result.data, "Failed to fetch results"));
    return { id: jobId, status: "failed", images: [], scene: "", model: "", created_at: new Date().toISOString() };
  }

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
  const result = await requestJson<ApiEnvelope<any>>("/api/retry-generation", {
    method: "POST",
    requireAuth: true,
    body: JSON.stringify({ generation_id }),
  });

  if (result.error || !result.data) {
    console.error("Failed to retry generation", result.error);
    return { success: false };
  }

  return { success: true };
}

export async function getGenerations(signal?: AbortSignal): Promise<any[]> {
  const result = await requestJson<ApiEnvelope<any[]>>("/api/generations", {
    requireAuth: true,
    signal,
  });

  if (result.error || !result.data) {
    console.error("Failed to fetch generations history", result.error);
    return [];
  }

  const data = unwrapPayload<any[]>(result.data);
  return Array.isArray(data) ? data : [];
}

export async function generateVariations(generation_id: string, image_url: string): Promise<{ job_id: string }> {
  const result = await requestJson<ApiEnvelope<{ generation_id?: string; id?: string }>>(
    "/api/generate-variations",
    {
      method: "POST",
      requireAuth: true,
      body: JSON.stringify({ generation_id, image_url }),
    }
  );

  if (result.error || !result.data) {
    console.error("Failed to generate variations", result.error);
    return { job_id: "" };
  }

  const data = unwrapPayload<{ generation_id?: string; id?: string }>(result.data);
  if (!data) {
    console.error(extractErrorMessage(result.data, "Failed to generate variations"));
    return { job_id: "" };
  }

  return { job_id: data.generation_id || data.id || "" };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = await requestJson<ApiEnvelope<{ stats?: DashboardStats } | DashboardStats>>(
    "/api/dashboard-stats",
    {
      requireAuth: true,
    }
  );

  if (result.error || !result.data) {
    console.error("Failed to fetch dashboard stats", result.error);
    return { credits: 0, images_generated: 0, active_projects: 0, storage_used: "0 MB" };
  }

  const data = unwrapPayload<{ stats?: DashboardStats } | DashboardStats>(result.data);
  if (!data) {
    return { credits: 0, images_generated: 0, active_projects: 0, storage_used: "0 MB" };
  }

  return ("stats" in data && data.stats ? data.stats : data) as DashboardStats;
}

export async function uploadProduct(file: File, name: string): Promise<{ product_id: string; image_url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("name", name);

  const result = await requestJson<ApiEnvelope<any>>("/api/products", {
    method: "POST",
    requireAuth: true,
    body: formData,
  });

  if (result.error || !result.data) {
    console.error("Failed to upload product", result.error);
    return { product_id: "", image_url: "" };
  }

  const data = unwrapPayload<any>(result.data);
  if (!data) {
    console.error(extractErrorMessage(result.data, "Failed to upload product"));
    return { product_id: "", image_url: "" };
  }

  return {
    product_id: data.product?.id || data.productId || "",
    image_url: data.imageUrl || "",
  };
}

export async function deleteProduct(id: string): Promise<boolean> {
  const result = await requestJson<ApiEnvelope<any>>(`/api/products?id=${id}`, {
    method: "DELETE",
    requireAuth: true,
  });

  if (result.error || !result.data) {
    console.error("Failed to delete product", result.error);
    return false;
  }

  return true;
}

export async function uploadAsset(blob: Blob): Promise<{ asset_url: string }> {
  const formData = new FormData();
  const file = new File([blob], `asset-${Date.now()}.png`, { type: "image/png" });
  formData.append("file", file);
  formData.append("name", file.name);

  const result = await requestJson<ApiEnvelope<any>>("/api/products", {
    method: "POST",
    requireAuth: true,
    body: formData,
  });

  if (result.error || !result.data) {
    console.error("Failed to save asset", result.error);
    return { asset_url: "" };
  }

  const data = unwrapPayload<any>(result.data);
  if (!data) {
    console.error(extractErrorMessage(result.data, "Failed to save asset"));
    return { asset_url: "" };
  }

  return { asset_url: data.imageUrl || "" };
}

export async function callImageTool(imageUrl: string, tool: "remove_bg" | "upscale" | "product_fix" | string): Promise<{ job_id: string }> {
  const result = await requestJson<ApiEnvelope<any>>(`/api/tools/${tool}`, {
    method: "POST",
    requireAuth: true,
    body: JSON.stringify({ imageUrl, tool }),
  });

  if (result.error || !result.data) {
    console.error("Failed to start tool", result.error);
    return { job_id: "" };
  }

  const data = unwrapPayload<any>(result.data);
  if (!data) {
    console.error(extractErrorMessage(result.data, "Failed to start tool"));
    return { job_id: "" };
  }

  return { job_id: data.job_id || data.jobId || "" };
}

export async function fetchAssets() {
  const result = await requestJson<ApiEnvelope<any[]>>("/api/assets", {
    requireAuth: true,
  });

  if (result.error || !result.data) {
    console.error("Failed to fetch assets", result.error);
    return [];
  }

  const data = unwrapPayload<any[]>(result.data);
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((asset): AssetRecord | null => {
      const src = asset?.image_url || asset?.asset_url || asset?.url || "";
      if (!asset?.id || !src) {
        return null;
      }

      return {
        id: String(asset.id),
        src,
        name: asset.name || asset.title || "Saved asset",
        createdAt: asset.created_at || new Date().toISOString(),
      };
    })
    .filter((asset): asset is AssetRecord => Boolean(asset));
}

export async function fetchProducts(): Promise<ProductRecord[]> {
  const result = await requestJson<ApiEnvelope<{ products?: any[] }>>("/api/products", {
    requireAuth: true,
  });

  if (result.error || !result.data) {
    console.error("Failed to fetch products", result.error);
    return [];
  }

  const data = unwrapPayload<{ products?: any[] }>(result.data);
  const products = Array.isArray(data?.products) ? data.products : [];

  return products
    .map((product) => {
      if (!product?.id) {
        return null;
      }

      return {
        id: String(product.id),
        name: product.name || "Untitled product",
        imageUrl: product.image_url || product.imageUrl || "",
        addedAt: product.created_at || new Date().toISOString(),
      };
    })
    .filter((product): product is ProductRecord => Boolean(product));
}

export async function getGeneration(id: string): Promise<{ success: boolean; image_url?: string; status?: string }> {
  const result = await requestJson<ApiEnvelope<any>>(`/api/generation/${id}`, {
    requireAuth: false, // Since this is a public dashboard / local service.
  });

  if (result.error || !result.data) {
    throw new Error(result.error || "Failed to fetch generation");
  }
  
  const data = unwrapPayload<any>(result.data);
  return {
    success: true,
    image_url: data?.image_url,
    status: data?.status
  };
}

export async function pollImage(id: string): Promise<string> {
  let retries = 20;

  while (retries > 0) {
    try {
      const res = await getGeneration(id);
      
      if (res.image_url) {
        return res.image_url;
      }
    } catch (e) {
      console.warn("Polling error, continuing...", e);
    }
    await new Promise(r => setTimeout(r, 2000));
    retries--;
  }

  throw new Error("Timeout");
}

export async function generateShoot(payload: {
  product_image: string;
  user_prompt: string;
  shoot_type: string;
  gender?: string;
  multi_angle: boolean;
}) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_image: payload.product_image,
      user_prompt: payload.user_prompt,
      shoot_type: payload.shoot_type,
      gender: payload.gender || "none",
      multi_angle: payload.multi_angle,
      user_id: "demo-user"
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error: ${text}`);
  }

  const data = await res.json();
  console.log("API RESPONSE:", data);

  if (!data.success) {
    throw new Error(data.error || "Generation failed");
  }

  // HANDLE MULTI-ANGLE
  if (data.images) {
    return data.images;
  }

  // HANDLE SINGLE REQUEST
  if (data.request_id) {
    return [{ request_id: data.request_id }];
  }

  // HANDLE NEW FORMAT
  if (data.request_ids) {
    return data.request_ids.map(id => ({ request_id: id }));
  }

  throw new Error("Invalid response format");
}

void sceneFashion;
void sceneInfluencer;
