import { asyncHandler } from "../utils/asyncHandler.js";
import vision from '@google-cloud/vision';

// Creates a client
const client = new vision.ImageAnnotatorClient();

export const recognizeGadget = asyncHandler(async (req, res) => {
  try {
    if (!req.file) 
      return res.status(400).json({ error: 'No image file uploaded' });

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
    const starMatch = fullText.match(/(\d+)\s*star/i);
    const starRating = starMatch ? parseInt(starMatch[1]) : "Not detected";

    // 4️⃣ Object localization
    const [objResponse] = await client.objectLocalization({ image });
    const objects = (objResponse.localizedObjectAnnotations || []).map(o => ({
      name: o.name,
      score: o.score
    }));

    // 5️⃣ First/highest confidence items for convenience
    const mainLabel = labels[0] || null;
    const mainObject = objects[0] || null;
    const mainBrand = brands[0] || null;

    // Build response
    res.json({
      applianceLabels: labels,
      detectedObjects: objects,
      brandDetected: brands,  
      starRating,
      extractedText: fullText,
      mainLabel,
      mainObject,
      mainBrand
    });

  } catch (err) {
    console.error('Vision API error:', err);
    res.status(500).json({ error: 'Vision API failed', details: err.message });
  }
});
