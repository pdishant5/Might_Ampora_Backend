import { GoogleGenAI } from "@google/genai";

// Single centralized client — new @google/genai SDK style
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MODEL = "gemini-2.5-flash";

const APPLIANCE_ANALYSIS_PROMPT = `You are an appliance expert. Analyze the image and return a JSON object with ONLY these fields (no markdown, no code blocks, raw JSON only):
{
  "is_electric_appliance": Boolean. Set to true only if the object is a household electric appliance. Set to false for gas appliances, non-electric furniture, pets, or people.
  "appliance": Type of appliance (null if is_electric_appliance is false).
  "brand": Brand name (null if not visible or if is_electric_appliance is false).
  "power_rating_watts": The wattage from the sticker, or a standard industry average (null if is_electric_appliance is false).
  "is_estimated": Boolean. true if using an average, false if read from the image.
}`;

/**
 * Analyzes an appliance image using Gemini Flash and returns structured JSON.
 * @param {Buffer} imageBuffer - The raw image buffer from multer.
 * @param {string} mimeType   - e.g. "image/jpeg" or "image/png"
 * @returns {Promise<Object>} - Parsed appliance analysis object
 */
export const analyzeApplianceImage = async (imageBuffer, mimeType = "image/jpeg") => {
    const response = await ai.models.generateContent({
        model: MODEL,
        contents: [
            {
                role: "user",
                parts: [
                    { text: APPLIANCE_ANALYSIS_PROMPT },
                    {
                        inlineData: {
                            data: imageBuffer.toString("base64"),
                            mimeType,
                        },
                    },
                ],
            },
        ],
    });

    const text = response.text.trim();

    // Strip markdown code fences if the model wraps the JSON
    const jsonText = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();

    return JSON.parse(jsonText);
};

/**
 * Gets an estimated wattage for a named appliance using Gemini text generation.
 * @param {string} applianceName
 * @returns {Promise<string>} - e.g. "700 W"
 */
export const getApplianceWattageEstimate = async (applianceName) => {
    const prompt = `What is the standard industry average power consumption in watts for a "${applianceName}"? Reply with ONLY a single integer number representing the watts. No units, no explanation.`;

    const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
    });

    const watts = parseInt(response.text.trim(), 10);
    return isNaN(watts) ? "0 W" : `${watts} W`;
};
