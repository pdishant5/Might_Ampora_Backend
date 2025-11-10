import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError } from "../utils/apiError.js";

// Create GenAI API client..
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// For vision models, use "gemini-1.5-flash" (fast) or "gemini-1.5-pro" (high quality)
export const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

function fileToGenerativePart(base64Image, mimeType) {
    return {
        inlineData: {
            data: base64Image,
            mimeType,
        },
    };
}

export async function analyzeAppliance(base64Image, mimeType) {
    try {

        // This is the most important part: the prompt.
        // We explicitly ask for JSON output.
        const prompt = `
            Analyze the provided image of an electronic appliance.
            Identify the following three pieces of information:
            1. applianceType: The name of the appliance (e.g., "Water Heater", "Air Conditioner").
            2. brand: The brand name visible on the appliance.
            3. starRating: The star rating (e.g., "1 Star", "3 Star", "Not Visible").

            Return this information *only* as a valid JSON object.
            Example: {"applianceType": "Water Heater", "brand": "Padmini", "starRating": "1 Star"}
        `;

        // Create the image part from your file
        const imagePart = fileToGenerativePart(base64Image, mimeType);

        // Send the prompt and the image to the model
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        // console.log("Raw response from API:", text);

        // Clean the text to ensure it's valid JSON
        // The API might wrap the JSON in markdown ```json ... ```
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        // Parse the JSON string into a JavaScript object
        const jsonData = JSON.parse(cleanedText);
        return jsonData;

    } catch (error) {
        throw new ApiError(500, "Error analyzing appliance image!" + error.message);
    }
};