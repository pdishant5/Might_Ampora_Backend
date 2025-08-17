import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";

const userSchema = new Schema({
    name: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true
    },
    mobileNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    facebookId: {
        type: String,
        unique: true,
        sparse: true
    },
    provider: {
        type: String,
        enum: ["google", "facebook", "mobile"],
        required: true,
    },
    refreshToken: String,
    refreshTokenExpiry: Date,
}, { timestamps: true });

userSchema.methods.generateAccessToken = function (payload) {

    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
};

userSchema.methods.generateRefreshToken = function (payload) {

    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

export const User = mongoose.model("User", userSchema);