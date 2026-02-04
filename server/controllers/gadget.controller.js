import { Client, handle_file } from "@gradio/client";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Static mapping for typical wattage values
const APPLIANCE_WATTAGE_MAP = {
    "Air Conditioner": "2000 W",
    "Ceiling Fan": "75 W",
    "Microwave": "1200 W",
    "Refrigerator": "400 W",
    "Television": "100 W",
    "Washing Machine": "700 W"
};

/**
 * Recognizes the gadget using Hugging Face ResNet model and
 * returns static wattage based on the detected category.
 */
export const recognizeGadget = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        throw new ApiError(400, "No image file uploaded!");
    }

    try {
        //  Connect to your Hugging Face Space
        const app = await Client.connect("crash847/HomeApplianceClassifier");

        // Prepare the image for the Gradio API
        const imageBlob = new Blob([req.file.buffer]);
        const imageFile = handle_file(imageBlob);

        //  Predict using the specific named endpoint identified in your API info
        const result = await app.predict("/predict_image", { 
            img: imageFile 
        });

        if (!result || !result.data) {
            throw new ApiError(400, "Failed to recognize the appliance!");
        }

        //  Extract the detected label 
        const detection = result.data[0];
        const applianceLabel = detection.label;
        const confidence = (detection.confidences[0].confidence * 100).toFixed(2) + "%";

        //  Look up the static wattage from our map
        const staticWattage = APPLIANCE_WATTAGE_MAP[applianceLabel] || "0 W";

        //  Return the combined result to the frontend
        return res.status(200).json(
            new ApiResponse(200, {
                mainName: applianceLabel,
                mainBrand: "Detected",
                starRating: "3 Star", // Default or extracted if supported
                estimatedWattage: staticWattage,
                confidence: confidence
            }, "Appliance recognized successfully!")
        );

    } catch (err) {
        console.error("Hugging Face API Error:", err);
        return next(new ApiError(500, "Error during appliance recognition: " + err.message));
    }
});

export const getEstimatedWattage = asyncHandler(async (req, res) => {
    const { mainName } = req.body;

    if (!mainName) {
        throw new ApiError(400, "Appliance name is required for estimation!");
    }

    const wattage = APPLIANCE_WATTAGE_MAP[mainName] || "0 W";

    return res.status(200).json(
        new ApiResponse(
            200,
            { estimatedWattage: wattage },
            "Estimated wattage fetched successfully"
        )
    );
});