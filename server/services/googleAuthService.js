import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model.js";

const client = new OAuth2Client();

export const verifyGoogleToken = async (idToken) => {
    const ticket = await client.verifyIdToken({
        idToken,
        audience: [
            process.env.GOOGLE_CLIENT_ID, // Web client ID
            process.env.GOOGLE_ANDROID_CLIENT_ID, // Android client ID
        ],
    });

    const payload = ticket.getPayload();

    return {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
    };
};

export const handleGoogleAuth = async (idToken) => {
    const { googleId, email, name } = await verifyGoogleToken(idToken);

    let user = await User.findOne({ email });
    let newUser = 0;

    if (!user) {
        user = await User.create({
            googleId,
            email,
            name,
            provider: "google",
        });
        newUser = 1;
    }

    const payload = {
        userId: user._id,
        email: user.email
    };
    const accessToken = user.generateAccessToken(payload);
    const refreshToken = user.generateRefreshToken(payload);

    return { user, accessToken, refreshToken, newUser };
};