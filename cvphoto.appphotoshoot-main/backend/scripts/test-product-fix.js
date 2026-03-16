const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

async function testProductFix() {
    console.log("Starting Product Fix Tool E2E Verification...");
    
    // We mock the user request that the frontend would send to Next.js API
    // Normally requires auth cookie, but we'll test the tool execution locally.
    console.log("Verifying .env config loaded correctly...");
    console.log(`ENABLE_PRODUCT_FIX: ${process.env.ENABLE_PRODUCT_FIX || 'NOT SET'}`);
    console.log(`CREDITS_PRODUCT_FIX: ${process.env.CREDITS_PRODUCT_FIX || 'NOT SET'}`);
    
    // 1. We mock the ASTRIA API request matching the exact payload /api/image-tools uses.
    const apiKey = process.env.ASTRIA_API_KEY;
    if (!apiKey) {
        console.log("No ASTRIA_API_KEY. Tool will run in MOCK mode as designed.");
        return;
    }

    const testImageUrl = "https://via.placeholder.com/512";
    console.log(`Sending test request to Astria with image: ${testImageUrl}`);
    
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
        if (response.ok) {
            console.log("SUCCESS: Astria accepted the Product Fix prompt payload.");
            console.log(`Returned Job/Image Data from Provider:`, data);
        } else {
            console.error("FAILURE: Provider rejected the payload.", data);
            process.exit(1);
        }
    } catch (e) {
        console.error("FAILURE: Test disconnected.", e.message);
        process.exit(1);
    }
}

testProductFix();
