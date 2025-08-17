import mongoose, { Schema } from "mongoose";

const otpSchema = new Schema({
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
        sparse: true
    },
    otp: {
        type: String,
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
    }
}, { timestamps: true });

// TTL Index: Automatically remove expired OTPs..
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OTP = mongoose.model("OTP", otpSchema);