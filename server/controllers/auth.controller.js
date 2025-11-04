import { User } from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";
import redis from "../config/redis.js";
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/apiResponse.js';

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

const OTP_TTL = parseInt(process.env.OTP_TTL_SECONDS || "300");
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || "5");
const OTP_RESEND_LIMIT = parseInt(process.env.OTP_RESEND_LIMIT || "3");
const RESEND_WINDOW = 3600; // 1 hour

function generateOtp(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return String(Math.floor(Math.random() * (max - min + 1) + min));
}

async function hashOtp(otp) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(otp, salt);
}

async function compareOtp(plain, hashed) {
  return bcrypt.compare(plain, hashed);
}

export async function requestOtp(userId) {
  const resendKey = `otp_resend:${userId}`;
  const resendCount = parseInt((await redis.get(resendKey)) || "0", 10);
  if (resendCount >= OTP_RESEND_LIMIT)
    throw new Error("Too many OTP requests. Try later.");

  const otp = generateOtp(6);
  const hashed = await hashOtp(otp);
  const otpKey = `otp:${userId}`;

  await redis.set(otpKey, hashed, "EX", OTP_TTL);
  await redis.multi().incr(resendKey).expire(resendKey, RESEND_WINDOW).exec();

  console.log(`🔐 OTP for ${userId}: ${otp}`);
  return otp; // you’ll normally email or SMS this
}


export async function verifyOtp(userId, otp) {
  const otpKey = `otp:${userId}`;
  const attemptsKey = `otp_attempts:${userId}`;

  const hashed = await redis.get(otpKey);
  if (!hashed) throw new Error("OTP expired or not found.");

  const attempts = parseInt((await redis.get(attemptsKey)) || "0", 10);
  if (attempts >= OTP_MAX_ATTEMPTS)
    throw new Error("Too many wrong attempts.");

  const valid = await compareOtp(otp, hashed);
  if (!valid) {
    await redis
      .multi()
      .incr(attemptsKey)
      .expire(attemptsKey, Math.max(OTP_TTL, 300))
      .exec();
    throw new Error("Invalid OTP.");
  }

  await redis.multi().del(otpKey).del(attemptsKey).exec();
  return true;
}

export const signInWithOTP = asyncHandler(async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing user id" });
    await requestOtp(id);
    res.json({ ok: true, message: "OTP sent successfully" });
});

export const verifyOTP = asyncHandler(async (req, res) => {
    const { id, otp } = req.body;
    if (!id || !otp) return res.status(400).json({ error: "Missing id or otp" });
    await verifyOtp(id, otp);
    res.json({ ok: true, message: "OTP verified successfully" });
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