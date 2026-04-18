import fetch from "node-fetch";

async function run() {
  const body = {
    "user_id": "test_1",
    "gender": "male",
    "user_prompt": "wearing sunglasses",
    "product_image": "https://i.imgur.com/your-image.jpg",
    "shoot_type": "studio",
    "multi_angle": true
  };

  try {
    const res = await fetch("http://localhost:3000/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

run();
