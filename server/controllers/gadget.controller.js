import { asyncHandler } from "../utils/asyncHandler.js";
import vision from "@google-cloud/vision";

// Create Vision API client
const client = new vision.ImageAnnotatorClient();

export const recognizeGadget = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const image = { content: req.file.buffer };

    // 1️⃣ Detect general labels (type of device)
    const [labelResponse] = await client.labelDetection({ image });
    const labels = (labelResponse.labelAnnotations || []).map((l) => l.description);

    // 2️⃣ Detect brand logos
    const [logoResponse] = await client.logoDetection({ image });
    const brands = (logoResponse.logoAnnotations || []).map((l) => l.description);

    // 3️⃣ Object localization (e.g. Laptop, Keyboard, Phone)
    const [objResponse] = await client.objectLocalization({ image });
    const objects = (objResponse.localizedObjectAnnotations || []).map((o) => o.name);

    // 4️⃣ Extract text for possible "star rating"
    const [textResponse] = await client.textDetection({ image });
    const fullText = textResponse.fullTextAnnotation?.text || "";
    const starMatch = fullText.match(/(\d+)\s*star/i);
    const starRating = starMatch ? `${starMatch[1]} star` : "Not detected";

    // 5️⃣ Clean, short response
    const mainName =
      objects[0] ||
      labels[0] ||
      "Unknown Appliance";

    const mainBrand = brands[0] || "Unknown Brand";

    res.json({
      mainName,
      mainBrand,
      starRating,
    });

  } catch (err) {
    console.error("⚠️ Vision API Error:", err);
    res.status(500).json({
      error: "Vision API failed",
      details: err.message,
    });
  }
});
