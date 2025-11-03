import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import vision from '@google-cloud/vision';

// Creates a client..
const client = new vision.ImageAnnotatorClient();

export const recognizeGadget = asyncHandler(async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });

    const image = { content: req.file.buffer };

    // 1️⃣ Detect appliance type (labels)
    const [labelResponse] = await client.labelDetection({ image });
    const labels = (labelResponse.labelAnnotations || []).map(l => ({
      description: l.description,
      score: l.score
    }));

    // 2️⃣ Detect brand logos
    const [logoResponse] = await client.logoDetection({ image });
    const brands = (logoResponse.logoAnnotations || []).map(l => ({
      brand: l.description,
      score: l.score
    }));

    // 3️⃣ Extract text for star rating / extra info
    const [textResponse] = await client.textDetection({ image });
    const fullText = textResponse.fullTextAnnotation?.text || "";

    // Extract possible star rating e.g. "5 Star", "4STAR"
    const starMatch = fullText.match(/(\d+)\s*star/i);
    const starRating = starMatch ? parseInt(starMatch[1]) : null;

    // 4️⃣ Object localization (optional)
    const [objResponse] = await client.objectLocalization({ image });
    const objects = (objResponse.localizedObjectAnnotations || []).map(o => ({
      name: o.name, score: o.score
    }));

    // Build Response
    res.json({
      applianceLabels: labels,
      detectedObjects: objects,
      brandDetected: brands.length ? brands : "Brand not clearly visible",
      starRating: starRating || "Not detected",
      extractedText: fullText // useful for debugging & future parsing
    });

  } catch (err) {
    console.error('Vision API error:', err);
    res.status(500).json({ error: 'Vision API failed', details: err.message });
  }
});