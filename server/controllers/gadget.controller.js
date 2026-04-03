import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { analyzeApplianceImage, getApplianceWattageEstimate } from "../services/geminiService.js";

/**
 * Recognizes the gadget using Gemini Flash (vision) and returns
 * appliance details including brand, wattage, and estimation flag.
 */
export const recognizeGadget = asyncHandler(async (req, res, next) => {
    if (!req.file) {
        throw new ApiError(400, "No image file uploaded!");
    }

    try {
        const mimeType = req.file.mimetype || "image/jpeg";
        const analysis = await analyzeApplianceImage(req.file.buffer, mimeType);

        if (!analysis.is_electric_appliance) {
            return res.status(200).json(
                new ApiResponse(200, {
                    isElectricAppliance: false,
                    mainName: null,
                    mainBrand: null,
                    estimatedWattage: null,
                    isEstimated: null,
                }, "The uploaded image does not appear to be a household electric appliance.")
            );
        }

        const wattageDisplay = analysis.power_rating_watts != null
            ? `${analysis.power_rating_watts} W`
            : "0 W";

        return res.status(200).json(
            new ApiResponse(200, {
                isElectricAppliance: true,
                mainName: analysis.appliance,
                mainBrand: analysis.brand ?? "Unknown",
                estimatedWattage: wattageDisplay,
                isEstimated: analysis.is_estimated,
            }, "Appliance recognized successfully!")
        );

    } catch (err) {
        console.error("Gemini API Error:", err);
        return next(new ApiError(500, "Error during appliance recognition: " + err.message));
    }
});

export const getEstimatedWattage = asyncHandler(async (req, res, next) => {
    const { mainName } = req.body;

    if (!mainName) {
        throw new ApiError(400, "Appliance name is required for estimation!");
    }

    try {
        const estimatedWattage = await getApplianceWattageEstimate(mainName);

        return res.status(200).json(
            new ApiResponse(200, { estimatedWattage }, "Estimated wattage fetched successfully")
        );
    } catch (err) {
        console.error("Gemini wattage estimation error:", err);
        return next(new ApiError(500, "Error estimating wattage: " + err.message));
    }
});