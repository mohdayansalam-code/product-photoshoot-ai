import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        products: [
          {
            id: "1",
            name: "Test Product",
            image_url: "https://via.placeholder.com/300?text=Mock+Product"
          }
        ]
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/", (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        product: { id: "new-product-123", name: "New Uploaded Product" },
        imageUrl: "https://via.placeholder.com/300?text=Uploaded+Mock"
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
