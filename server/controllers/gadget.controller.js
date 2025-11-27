import { analyzeAppliance, generateWattageText } from "../services/geminiService.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const recognizeGadget = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            status: "error",
            message: "No image file uploaded!"
        });
    }

    // const myImagePath = req.file.path;
    const myMimeType = req.file.mimetype;
    const base64Image = req.file.buffer.toString("base64");

    const response = await analyzeAppliance(base64Image, myMimeType);

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
            message: "Insufficient data to estimate wattage!",
        });
    }

    try {
        const prompt = `
            What is the typical power consumption (wattage) for a
            '${mainBrand} ${mainName}' with a '${starRating}' rating?

            Provide *only* the most common wattage value (e.g., "2000 W")
            or average wattage value of a typical range
            (e.g., "2500 W" for the range "2000 W - 3000 W").

            Do not add any other explanatory text, just the value.
        `;

        const text = await generateWattageText(prompt);
        // Clean the returned text to a single token (remove stray quotes/backticks done inside service)
        const cleaned = text.replace(/[`"*]+/g, "").trim();

        return res.status(200).json(
        new ApiResponse(
            200,
            {
                estimatedWattage: cleaned,
            },
            "Estimated wattage fetched successfully"
        )
        );
    } catch (err) {
        // If it's our ApiError, pass it directly otherwise wrap
        if (err instanceof ApiError) return next(err);
        return next(new ApiError(500, "Error fetching wattage! " + (err.message || String(err))));
    }
});