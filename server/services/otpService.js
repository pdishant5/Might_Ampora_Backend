import redis from "../config/redis.js";
import {
    OTP_TTL,
    OTP_MAX_ATTEMPTS,
    OTP_RESEND_LIMIT,
    RESEND_WINDOW,
    generateOtp,
    hashOtp,
    compareOtp
} from "../utils/otpUtils.js";

export async function requestOtp(userId) {
    const resendKey = `otp_resend:${userId}`;
    const resendCount = parseInt((await redis.get(resendKey)) || "0", 10);
    
    if (resendCount >= OTP_RESEND_LIMIT)
        throw new Error("Too many OTP requests. Try later.");

    const otp = generateOtp(4);
    const hashed = await hashOtp(otp);
    const otpKey = `otp:${userId}`;

    await redis.set(otpKey, hashed, "EX", OTP_TTL);
    await redis.multi().incr(resendKey).expire(resendKey, RESEND_WINDOW).exec();

    console.log(`🔐 OTP for ${userId}: ${otp}`);
    return otp; // you’ll normally email or SMS this
};

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
        throw new Error("Invalid OTP!");
    }

    await redis.multi().del(otpKey).del(attemptsKey).exec();
    return true;
};