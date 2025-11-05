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
            provider: user.provider
        },
        accessToken,
        refreshToken
    }, "User signed in successfully!"));
});

export const facebookSignIn = asyncHandler(async (req, res) => {
    const { accessToken } = req.body;
    
    if (!accessToken) {
        return res.status(400).json({
            status: "error",
            message: "Facebook access token is missing!"
        });
    }

    const {
        user,
        jwtAccessToken,
        refreshToken,
        newUser
    } = await handleFacebookAuth(accessToken);

    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days expiry
    await user.save();
    
    return res.status(200+newUser).json(new ApiResponse(200+newUser, {
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            provider: user.provider
        },
        accessToken: jwtAccessToken,
        refreshToken
    }, "User signed in successfully!"));
});

export const signInWithOTP = asyncHandler(async (req, res) => {
    const { id, mobileNumber } = req.body;
    if (!id || !mobileNumber) return res.status(400).json({ error: "User id or Mobile number is missing!" });
    await requestOtp(id, mobileNumber);
    res.json({ ok: true, message: "OTP sent successfully" });
});

export const verifyOTP = asyncHandler(async (req, res) => {
    const { id, otp } = req.body;
    if (!id || !otp) return res.status(400).json({ error: "Missing id or otp" });
    await verifyOtp(id, otp);
    res.json({ ok: true, message: "OTP verified successfully" });
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