import {
    OTP_TTL,
    OTP_MAX_ATTEMPTS,
    OTP_RESEND_LIMIT,
    RESEND_WINDOW,
    generateOtp,
    hashOtp,
    compareOtp
} from "../utils/otpUtils.js";
import { sendOTPSms } from "./smsService.js";

// Test account credentials for App Store review
// This allows reviewers to access the app without needing real phone verification
const TEST_PHONE_NUMBER = process.env.TEST_MOBILE_NUMBER;
const TEST_OTP = process.env.TEST_OTP;

// In-memory storage for OTPs (for development/small scale)
// For production, consider using a database or proper cache
const otpStore = new Map();
const resendStore = new Map();
const attemptsStore = new Map();

// Cleanup expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of otpStore.entries()) {
        if (data.expiresAt < now) {
            otpStore.delete(key);
        }
    }
    for (const [key, data] of resendStore.entries()) {
        if (data.expiresAt < now) {
            resendStore.delete(key);
        }
    }
    for (const [key, data] of attemptsStore.entries()) {
        if (data.expiresAt < now) {
            attemptsStore.delete(key);
        }
    }
}, 60000); // Clean up every minute

export async function requestOtp(mobileNumber) {
    const now = Date.now();
    
    // Backdoor for test account - used for App Store review
    if (mobileNumber === TEST_PHONE_NUMBER) {
        const otpKey = `otp:${mobileNumber}`;
        const hashed = await hashOtp(TEST_OTP);
        
        // Store the fixed test OTP
        otpStore.set(otpKey, {
            hashed,
            expiresAt: now + (OTP_TTL * 1000)
        });
        
        // Skip SMS sending for test account
        console.log(`Test account OTP requested: ${TEST_OTP}`);
        return TEST_OTP;
    }
    
    const resendKey = `otp_resend:${mobileNumber}`;
    const resendData = resendStore.get(resendKey);
    
    let resendCount = 0;
    if (resendData && resendData.expiresAt > now) {
        resendCount = resendData.count;
    }
    
    if (resendCount >= OTP_RESEND_LIMIT)
        throw new Error("Too many OTP requests. Try later.");

    const otp = generateOtp(4);
    const hashed = await hashOtp(otp);
    const otpKey = `otp:${mobileNumber}`;

    // Store OTP with expiration
    otpStore.set(otpKey, {
        hashed,
        expiresAt: now + (OTP_TTL * 1000)
    });

    // Update resend count
    resendStore.set(resendKey, {
        count: resendCount + 1,
        expiresAt: now + (RESEND_WINDOW * 1000)
    });

    // SMS the above generated OTP
    await sendOTPSms(mobileNumber, otp);
    return otp;
};

export async function verifyOtp(mobileNumber, otp) {
    const now = Date.now();
    const otpKey = `otp:${mobileNumber}`;
    const attemptsKey = `otp_attempts:${mobileNumber}`;

    // Backdoor for test account - used for App Store review
    if (mobileNumber === TEST_PHONE_NUMBER && otp === TEST_OTP) {
        console.log('Test account OTP verified successfully');
        // Clear any stored OTP data for test account
        otpStore.delete(otpKey);
        attemptsStore.delete(attemptsKey);
        return true;
    }

    const otpData = otpStore.get(otpKey);
    if (!otpData || otpData.expiresAt < now) {
        throw new Error("OTP expired or not found.");
    }

    const attemptsData = attemptsStore.get(attemptsKey);
    let attempts = 0;
    if (attemptsData && attemptsData.expiresAt > now) {
        attempts = attemptsData.count;
    }

    if (attempts >= OTP_MAX_ATTEMPTS)
        throw new Error("Too many wrong attempts.");

    const valid = await compareOtp(otp, otpData.hashed);
    if (!valid) {
        attemptsStore.set(attemptsKey, {
            count: attempts + 1,
            expiresAt: now + (Math.max(OTP_TTL, 300) * 1000)
        });
        throw new Error("Invalid OTP!");
    }

    // Clear OTP and attempts on successful verification
    otpStore.delete(otpKey);
    attemptsStore.delete(attemptsKey);
    return true;
};