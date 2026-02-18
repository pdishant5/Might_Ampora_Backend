import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.model.js";

const client = new OAuth2Client();

export const verifyGoogleToken = async (idToken) => {
    const ticket = await client.verifyIdToken({
        idToken,
        audience: [
            process.env.GOOGLE_CLIENT_ID, // Web client ID
            process.env.GOOGLE_ANDROID_CLIENT_ID, // Android client ID
            process.env.GOOGLE_IOS_CLIENT_ID, // iOS client ID
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

    // Try to find user by email first 
    let user = await User.findOne({ email });
    let newUser = 0;

    if (!user) {
        // Create new user with Google provider
        user = await User.create({
            googleId,
            email,
            name,
            providers: ["google"],
        });
        newUser = 1;
    } else {
        // User exists - merge Google auth
        if (!user.googleId) {
            user.googleId = googleId;
        }
        if (!user.name) {
            user.name = name;
        }
        if (!user.providers.includes("google")) {
            user.providers.push("google");
        }
        await user.save();
        console.log(` Merged Google auth for user: ${email} (Providers: ${user.providers.join(", ")})`);
    }

    const payload = {
        userId: user._id,
        email: user.email
    };
    const accessToken = user.generateAccessToken(payload);
    const refreshToken = user.generateRefreshToken(payload);

    return { user, accessToken, refreshToken, newUser };
};