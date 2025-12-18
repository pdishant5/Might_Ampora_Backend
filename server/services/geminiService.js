// src/services/geminiService.js
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ApiError } from "../utils/apiError.js";

/**
 * Gemini failover service
 *
 * Expects these env variables:
 * - GEMINI_API_KEY_PRIMARY
 * - GEMINI_API_KEY_SECONDARY  (optional)
 *
 * Usage:
 *  import * as geminiService from "../services/geminiService.js";
 *  await geminiService.analyzeAppliance(base64, mimeType);
 *  await geminiService.generateWattageText(prompt);
 */

const PRIMARY_KEY = process.env.GEMINI_API_KEY_PRIMARY;
const SECONDARY_KEY = process.env.GEMINI_API_KEY_SECONDARY || null;
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-1.5-flash";

/** Create a GoogleGenerativeAI client for a given API key */
function createClient(apiKey) {
    if (!apiKey) return null;
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: MODEL_NAME });
}

/** Initialize models (may be null if key missing) */
const primaryModel = createClient(PRIMARY_KEY);
const secondaryModel = createClient(SECONDARY_KEY);

/** Utility: detect "retryable" errors we should fallback on */
function isRetryableError(err) {
    if (!err) return false;

    const status = err.response?.status || err.status || err.statusCode;

    // Never retry / failover on rate limits
    if (status === 429) {
        return false;
    }

    // Retryable infra errors only
    if (status === 503 || (status >= 500 && status < 600)) {
        return true;
    }

    const code = err.code;
    if (["ENOTFOUND", "ECONNRESET", "ETIMEDOUT"].includes(code)) {
        return true;
    }

    return false;
}


/** Helper: remove markdown fences and stray backticks then trim */
function cleanTextOutput(text) {
    if (!text || typeof text !== "string") return text;
    return text.replace(/```(?:json)?/g, "").replace(/```/g, "").trim().replace(/^["']+|["']+$/g, "");
}

/** Convert a base64 file into the generative part (same as your previous helper) */
function fileToGenerativePart(base64Image, mimeType) {
    return {
        inlineData: {
            data: base64Image,
            mimeType,
        },
    };
}

/**
 * Try to run a generation using the provided model instance.
 * The `callFn` is an async function that receives a model instance and performs the call.
 * If primary fails with a retryable error and secondary exists, fallback to secondary.
 */
async function runWithFailover(callFn) {
    // Try primary
    if (primaryModel) {
        try {
            return await callFn(primaryModel);
        } catch (err) {
                const status = err.response?.status || err.status || err.statusCode;

    if (status === 429) {
        throw new ApiError(
            429,
            "Gemini rate limit hit. Please retry after 60 seconds."
        );
    }

            if (!isRetryableError(err)) {
                // Non-retryable: bubble up immediately
                throw err;
            }
            // Retryable: attempt secondary if available
            console.warn("Primary Gemini failed with retryable error — will try secondary:", err.message || err);
        }
    }

    // If primary not present or failed retryably, try secondary
    if (secondaryModel) {
        try {
            return await callFn(secondaryModel);
        } catch (err2) {
            // Secondary failed too: throw combined error or secondary error
            const combinedErr = new Error(
                `Both Gemini primary and secondary failed. Secondary error: ${err2.message || err2}`
            );
            combinedErr.original = err2;
            throw combinedErr;
        }
    }

    // No model available
    throw new ApiError(500, "No Gemini API key configured (primary and secondary missing).");
}

/**
 * analyzeAppliance(base64Image, mimeType)
 * - sends the image + prompt asking for JSON
 * - returns parsed JSON object
 */
export async function analyzeAppliance(base64Image, mimeType) {
    return runWithFailover(async (model) => {
        try {
        const prompt = `
            Analyze the provided image of an electronic appliance.
            Identify the following three pieces of information:
            1. applianceType: The name of the appliance (e.g., "Water Heater", "Air Conditioner").
            2. brand: The brand name visible on the appliance.
            3. starRating: The star rating (e.g., "1 Star", "3 Star", "Not Visible").

            Return this information *only* as a valid JSON object.
            Example: {"applianceType": "Water Heater", "brand": "Padmini", "starRating": "1 Star"}
        `;

        const imagePart = fileToGenerativePart(base64Image, mimeType);

        // Support the older style you used: model.generateContent([prompt, imagePart])
        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const rawText = response.text();

        const cleanedText = cleanTextOutput(rawText);

        // Parse and return JSON
        try {
            const jsonData = JSON.parse(cleanedText);
            return jsonData;
        } catch (parseErr) {
            // If parsing failed, throw a helpful error including the cleaned text
            const e = new ApiError(500, `Failed to parse JSON from Gemini response: ${cleanedText}`);
            e.raw = cleanedText;
            throw e;
        }
        } catch (err) {
        // rethrow so runWithFailover can inspect & fallback if needed
        throw err;
        }
    });
}

/**
 * generateWattageText(prompt)
 * - sends a text prompt to the model, returns cleaned text (no markdown fences)
 */
export async function generateWattageText(prompt) {
    return runWithFailover(async (model) => {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const raw = response.text();
            return cleanTextOutput(raw);
        } catch (err) {
            throw err;
        }
    });
}
