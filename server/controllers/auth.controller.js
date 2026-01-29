import { User } from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { handleGoogleAuth } from '../services/googleAuthService.js';
import { handleFacebookAuth } from '../services/facebookAuthService.js';
import { requestOtp, verifyOtp } from '../services/otpService.js';

export const googleSignIn = asyncHandler(async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({
            status: "error",
            message: "Google ID token is missing!"
        });
    }

    const {
        user,
        accessToken,
        refreshToken,
        newUser
    } = await handleGoogleAuth(idToken);
    
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days expiry
    await user.save();

    return res.status(200+newUser).json(new ApiResponse(200+newUser, {
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            phone: user.mobileNumber || '',
            providers: user.providers
        },
        accessToken,
        refreshToken
    }, "User signed in successfully!"));
});

export const facebookSignIn = asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    
    if (!idToken) {
        return res.status(400).json({
            status: "error",
            message: "Firebase ID token is missing!"
        });
    }

    const {
        user,
        jwtAccessToken,
        refreshToken,
        newUser
    } = await handleFacebookAuth(idToken);

    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days expiry
    await user.save();
    
    return res.status(200+newUser).json(new ApiResponse(200+newUser, {
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            phone: user.mobileNumber || '',
            providers: user.providers
        },
        accessToken: jwtAccessToken,
        refreshToken
    }, "User signed in successfully!"));
});

export const requestOTP = asyncHandler(async (req, res) => {
    const { mobileNumber } = req.body;
    if (!mobileNumber) return res.status(400).json({ error: "Mobile number is missing!" });
    await requestOtp(mobileNumber);
    res.json({ ok: true, message: "OTP sent successfully" });
});

export const verifyOTP = asyncHandler(async (req, res) => {
    const { mobileNumber, otp } = req.body;
    if (!mobileNumber || !otp) return res.status(400).json({ error: "Missing mobile number or otp" });
    
    // Verify OTP
    await verifyOtp(mobileNumber, otp);
    
    // Check if user exists in database
    const user = await User.findOne({ mobileNumber });
    
    if (user) {
        // Existing user - generate tokens
        const payload = {
            userId: user._id,
            email: user.email
        };
        const accessToken = user.generateAccessToken(payload);
        const refreshToken = user.generateRefreshToken(payload);
        
        user.refreshToken = refreshToken;
        user.refreshTokenExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        await user.save();
        
        return res.status(200).json(new ApiResponse(200, {
            userExists: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.mobileNumber,
                location: user.location,
                providers: user.providers
            },
            accessToken,
            refreshToken
        }, "OTP verified successfully"));
    } else {
        // New user - no tokens yet, needs registration
        return res.status(200).json(new ApiResponse(200, {
            userExists: false,
            message: "Please complete registration"
        }, "OTP verified successfully"));
    }
});

export const signInWithOTP = asyncHandler(async (req, res) => {
    const { mobileNumber, name, email, location } = req.body;
    if (!mobileNumber || !name || !email || !location) {
        return res.status(400).json({
            status: "error",
            message: "All fields are required!"
        });
    }

    // First check if user exists by email (for merging with Google/Facebook)
    let user = await User.findOne({ email });
    let newUser = 0;

    if (!user) {
        // Check by mobile number as fallback
        user = await User.findOne({ mobileNumber });
    }

    if (!user) {
        // Create new user with mobile provider
        user = await User.create({
            mobileNumber,
            name,
            email,
            location,
            providers: ["mobile"],
        });
        newUser = 1;
    } else {
        // User exists - merge mobile auth
        if (!user.mobileNumber) {
            user.mobileNumber = mobileNumber;
        }
        if (!user.name) {
            user.name = name;
        }
        if (!user.location) {
            user.location = location;
        }
        if (!user.providers.includes("mobile")) {
            user.providers.push("mobile");
        }
        await user.save();
        console.log(`✅ Merged mobile auth for user: ${email} (Providers: ${user.providers.join(", ")})`);
    }

    const payload = {
        userId: user._id,
        email: user.email
    };
    const accessToken = user.generateAccessToken(payload);
    const refreshToken = user.generateRefreshToken(payload);

    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days expiry
    await user.save();

    return res.status(200+newUser).json(new ApiResponse(200+newUser, {
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            phone: user.mobileNumber || '',
            providers: user.providers
        },
        accessToken,
        refreshToken
    }, "User signed in successfully!"));
});

export const getUserProfile = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({
            status: "error",
            message: "Refresh token is required!"
        });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    if (!decoded) {
        return res.status(401).json({
            status: "error",
            message: "Invalid refresh token!"
        });
    }

    const user = await User.findById(decoded.userId);
    if (!user || (user.refreshToken !== refreshToken) || (user.refreshTokenExpiry && user.refreshTokenExpiry < new Date())) {
        return res.status(401).json({
            status: "error",
            message: "Invalid or expired refresh token!"
        });
    }

    return res.status(200).json(new ApiResponse(200, {
        user: {
            userId: user._id,
            name: user.name,
            email: user.email,
            mobileNumber: user.mobileNumber,
            provider: user.provider,
            location: user.location
        }
    }, "User profile fetched successfully!"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({
            status: "error",
            message: "Refresh token is required!"
        });
    }
    
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    if (!decoded) {
        return res.status(401).json({
            status: "error",
            message: "Invalid refresh token!"
        });
    }

    const user = await User.findById(decoded.userId);
    if (!user || (user.refreshToken !== refreshToken) || (user.refreshTokenExpiry && user.refreshTokenExpiry < new Date())) {
        return res.status(401).json({
            status: "error",
            message: "Invalid or expired refresh token!"
        });
    }

    const newPayload = {
        userId: payload.userId,
        email: payload.email
    };

    const newAccessToken = user.generateAccessToken(newPayload);
    const newRefreshToken = user.generateRefreshToken(newPayload);

    user.refreshToken = newRefreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days expiry
    await user.save();

    return res.status(200).json(new ApiResponse(200, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
    }, "Tokens refreshed successfully!"));
});

export const logoutUser = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({
            status: "error",
            message: "Refresh token is required!"
        });
    }

    // Remove the token from storage..
    const user = await User.findOne({ refreshToken });
    if (!user) {
        return res.status(401).json({
            status: "error",
            message: "Invalid refresh token!"
        });
    }

    user.refreshToken = undefined;
    user.refreshTokenExpiry = undefined;
    await user.save();

    return res.status(200).json(new ApiResponse(200, { status: "success" }, "User logged out successfully!"));
});