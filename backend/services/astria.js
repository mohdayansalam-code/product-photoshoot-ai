import fetch from "node-fetch";

export async function generateImage({ prompt, product_image, tune_id }) {
  try {
    const ASTRIA_API_KEY = process.env.ASTRIA_API_KEY;

    if (!ASTRIA_API_KEY || !tune_id) {
      throw new Error("ASTRIA_API_KEY or tune_id missing");
    }

    const response = await fetch(`https://api.astria.ai/tunes/${tune_id}/prompts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ASTRIA_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        prompt: { text: prompt },
        input_images: [product_image],
        num_images: 1,
        strength: 0.9,
        guidance_scale: 7.5,
        image_guidance_scale: 1.8,
        controlnet: "depth"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Astria POST API error:", errorText);
      return { success: false, error: `Astria API failed: ${errorText}` };
    }

    const data = await response.json();
    console.log("Astria POST response data:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error calling Astria POST:", error);
    return { success: false, error: error.message };
  }
}

export async function getGeneration(id) {
  try {
    const ASTRIA_API_KEY = process.env.ASTRIA_API_KEY;

    if (!ASTRIA_API_KEY) {
      throw new Error("ASTRIA_API_KEY is not set in .env");
    }

    // According to instructions: GET https://api.astria.ai/prompts/{id}
    const response = await fetch(`https://api.astria.ai/prompts/${id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${ASTRIA_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Astria GET API error:", errorText);
      return { success: false, error: `Astria GET failed: ${errorText}` };
    }

    const data = await response.json();
    console.log("Astria GET response data:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error calling Astria GET:", error);
    return { success: false, error: error.message };
  }
}
