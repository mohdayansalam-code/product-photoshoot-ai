import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
dotenv.config();

async function testProductFix() {
    console.log("Starting Product Fix Tool E2E Verification...");
    console.log(`ENABLE_PRODUCT_FIX: ${process.env.ENABLE_PRODUCT_FIX || 'NOT SET'}`);
    console.log(`CREDITS_PRODUCT_FIX: ${process.env.CREDITS_PRODUCT_FIX || 'NOT SET'}`);
    
    const apiKey = process.env.ASTRIA_API_KEY;
    if (!apiKey) {
        console.log("No ASTRIA_API_KEY. Tool will run in MOCK mode as safely designed in the backend.");
        return;
    }

    const testImageUrl = "https://via.placeholder.com/512";
    console.log(`Sending Payload...`);
    
    try {
        const response = await fetch("https://api.astria.ai/tunes/690204/prompts", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                prompt: {
                    text: "A product photo, fix product label distortions, correct packaging defects, improve text clarity, high quality",
                    image_url: testImageUrl,
                    num_images: 1,
                    model: "seedream-4.5"
                }
            }),
        });
        
        const data = await response.json();
        console.log("STATUS:", response.status);
    } catch (e) {
        console.error("Test error:", e.message);
    }
}

testProductFix();
