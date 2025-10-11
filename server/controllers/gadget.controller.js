import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import vision from '@google-cloud/vision';

// Creates a client..
const client = new vision.ImageAnnotatorClient();

export const recognizeGadget = asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image file uploaded!' });

    // Call label detection with image bytes
    const [labelResponse] = await client.labelDetection({ image: { content: req.file.buffer } });
    const labels = (labelResponse.labelAnnotations || []).map(l => ({
        description: l.description,
        score: l.score
    }));

    // Optionally: object localization (bounding boxes & object names)
    const [objResponse] = await client.objectLocalization({ image: { content: req.file.buffer } });
    const objects = (objResponse.localizedObjectAnnotations || []).map(o => ({
        name: o.name,
        score: o.score,
        boundingPoly: o.boundingPoly
    }));

    return res.status(200).json(new ApiResponse(200, {
        labels,
        objects
    }, "Gadget recognized successfully!"));
});