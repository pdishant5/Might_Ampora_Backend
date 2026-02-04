import admin from "firebase-admin";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";

export const verifyFirebaseFacebookToken = async (idToken) => {
    try {
        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Extract user info from Firebase token
        return {
            firebaseUid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name || decodedToken.display_name || decodedToken.email?.split('@')[0],
            phone: decodedToken.phone_number || decodedToken.phoneNumber || '',
            provider: decodedToken.firebase.sign_in_provider, 
        };
    } catch (error) {
        console.error('Firebase token verification error:', error);
        throw new ApiError(401, "Invalid Firebase ID token!");
    }
};

export const handleFacebookAuth = async (idToken) => {
    const { firebaseUid, email, name, phone } = await verifyFirebaseFacebookToken(idToken);

    if (!email) {
        throw new ApiError(400, "Facebook account does not provide email!");
    }

    // Try to find user by email first 
    let user = await User.findOne({ email });
    let newUser = 0;

    if (!user) {
        // Create new user with Facebook provider
        user = await User.create({
            facebookId: firebaseUid,
            email,
            name,
            mobileNumber: phone,
            providers: ["facebook"]
        });
        newUser = 1;
    } else {
        // User exists - merge Facebook auth
        if (!user.facebookId) {
            user.facebookId = firebaseUid;
        }
        if (!user.name) {
            user.name = name;
        }
        if (phone && !user.mobileNumber) {
            user.mobileNumber = phone;
        }
        if (!user.providers.includes("facebook")) {
            user.providers.push("facebook");
        }
        await user.save();
        console.log(` Merged Facebook auth for user: ${email} (Providers: ${user.providers.join(", ")})`);
    }

    const payload = {
        userId: user._id,
        email: user.email
    };
    const jwtAccessToken = user.generateAccessToken(payload);
    const refreshToken = user.generateRefreshToken(payload);

    return { user, jwtAccessToken, refreshToken, newUser };
};
