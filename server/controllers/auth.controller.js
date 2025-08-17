import { User } from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { OTP } from '../models/otp.model.js';

export const googleSignIn = asyncHandler(async (req, res) => {
    const { googleId, email, name } = req.body;
    if (!googleId || !email || !name) {
        return res.status(400).json({
            status: "error",
            message: "All fields are required!"
        });
    }

    let user = User.findOne({ googleId });
    let newUser = 0;

    if (!user) {
        user = new User({
            googleId,
            email,
            name,
            provider: "google",
        });
        newUser = 1;
    }
    
    const payload = { userId: user._id, email: user.email };
    const accessToken = user.createAccessToken(payload);
    const refreshToken = user.createRefreshToken(payload);
    
    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
    await user.save();

    return res.status(200+newUser).json(new ApiResponse(200+newUser, {
        accessToken,
        refreshToken,
        user
    }, "User signed in successfully!"));
});

export const facebookSignIn = asyncHandler(async (req, res) => {
    const { facebookId, email, name } = req.body;
    if (!facebookId || !email || !name) {
        return res.status(400).json({
            status: "error",
            message: "All fields are required!"
        });
    }

    let user = User.findOne({ facebookId });
    let newUser = 0;

    if (!user) {
        user = new User({
            facebookId,
            email,
            name,
            provider: "facebook"
        });
        newUser = 1;
    }

    const payload = { userId: user._id, email: user.email };
    const accessToken = user.createAccessToken(payload);
    const refreshToken = user.createRefreshToken(payload);

    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
    await user.save();
    
    return res.status(200+newUser).json(new ApiResponse(200+newUser, {
        accessToken,
        refreshToken,
        user
    }, "User signed in successfully!"));
});

export const signInWithOTP = asyncHandler(async (req, res) => {
    const { mobileNumber } = req.body;
    if (!mobileNumber) {
        return res.status(400).json({
            status: "error",
            message: "Mobile number is required!"
        });
    }

    const otpCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`OPT for ${mobileNumber}: ${otpCode}`); // In real app, send this OTP via SMS..

    await OTP.deleteMany({ mobileNumber }); // Remove any existing OTPs for the same number..
    
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // OTP valid for 5 minutes..
    await OTP.create({ mobileNumber, otp: otpCode, expiresAt });

    return res.status(201).json(new ApiResponse(201, { status: "success" }, "OTP sent successfully!"));
});

export const verifyOTP = asyncHandler(async (req, res) => {
    const { mobileNumber, otp } = req.body;
    if (!mobileNumber || !otp) {
        return res.status(400).json({
            status: "error",
            message: "Mobile number and OTP are required!"
        });
    }

    const validOtp = await OTP.findOne({ mobileNumber, otp });

    if (!validOtp) {
        return res.status(400).json({
            status: "error",
            message: "Invalid OTP!"
        });
    }
    if (new Date() > new Date(validOtp.expiresAt)) {
        return res.status(400).json({
            status: "error",
            message: "OTP expired!"
        });
    }

    // Remove the used OTP..
    await OTP.deleteOne({ _id: validOtp._id });

    // OTP is valid, proceed with user creation or login..
    let user = await User.findOne({ mobileNumber });
    let newUser = 0;

    if (!user) {
        user = new User({
            mobileNumber,
            provider: "mobile",
        });
        newUser = 1;
    }

    const payload = { userId: user._id, mobileNumber: user.mobileNumber };
    const accessToken = user.createAccessToken(payload);
    const refreshToken = user.createRefreshToken(payload);

    user.refreshToken = refreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
    await user.save();

    return res.status(200+newUser).json(new ApiResponse(200+newUser, {
        accessToken,
        refreshToken,
        user
    }, "User signed in successfully!"));
});

export const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return res.status(400).json({
            status: "error",
            message: "Refresh token is required!"
        });
    }

    const user = await User.findOne({ refreshToken });

    if (!user) {
        return res.status(401).json({
            status: "error",
            message: "Invalid refresh token!"
        });
    }

    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const newPayload = {
        userId: payload.userId,
        email: payload.email,
        mobileNumber: payload.mobileNumber
    };

    const newAccessToken = user.createAccessToken(newPayload);
    const newRefreshToken = user.createRefreshToken(newPayload);

    user.refreshToken = newRefreshToken;
    user.refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiry
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