import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

// Create GenAI API client..
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// For vision models, use "gemini-1.5-flash" (fast) or "gemini-1.5-pro" (high quality)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType,
        },
    };
}

async function analyzeAppliance(imagePath, mimeType) {
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
        const imagePart = fileToGenerativePart(imagePath, mimeType);

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
        return new ApiError(500, "Error analyzing appliance image!" + error.message);
    }
}

export const recognizeGadget = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            status: "error",
            message: "No image file uploaded!"
        });
    }

    const myImagePath = req.file.path;
    const myMimeType = req.file.mimetype;

    const response = await analyzeAppliance(myImagePath, myMimeType);
    
    fs.unlink(myImagePath, (err) => {
        if (err) {
            console.error("Error deleting file:", err.message);
        } else {
            console.log("Temporary file deleted!");
        }
    });

    if (!response) {
        return res.status(400).json({
            status: "error",
            message: "Failed to recognize the appliance!"
        });
    }

    return res.status(200).json(new ApiResponse(200, {
        mainName: response.applianceType,
        mainBrand: response.brand,
        starRating: response.starRating
    }, "Appliance recognized successfully!"));
});

export const getEstimatedWattage = asyncHandler(async (req, res) => {
    const { mainName, mainBrand, starRating } = req.body;
    
    if (!mainName || !mainBrand || !starRating || starRating === "Not Visible") {
        return res.status(400).json({
            status: "error",
            message: "Insufficient data to estimate wattage!"
        });
    }

    try {
        // This prompt is designed to get a single, clean answer.
        const prompt = `
            What is the typical power consumption (wattage) for a
            '${mainBrand} ${mainName}' with a '${starRating}' rating?

            Provide *only* the most common wattage value (e.g., "2000 W")
            or average wattage value of a typical range
            (e.g., "2500 W" for the range "2000 W - 3000 W").
            
            Do not add any other explanatory text, just the value.
        `;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        
        // Clean up any potential markdown or extra quotes
        return res.status(200).json(new ApiResponse(200, {
            estimatedWattage: text.replace(/[`"*]/g, "")
        }));

    } catch (error) {
        return new ApiError(500, "Error fetching wattage!" + error.message);
    }
});