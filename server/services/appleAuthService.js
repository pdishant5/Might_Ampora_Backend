import admin from "firebase-admin";
import { User } from "../models/user.model.js";

/**
 * Verify a Firebase ID token obtained from Apple Sign-In on the client.
 * Firebase Auth handles Apple token verification, so we just verify the
 * Firebase ID token that the Flutter client sends us after
 * FirebaseAuth.signInWithCredential().
 */
export const verifyAppleFirebaseToken = async (idToken) => {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Ensure the sign-in provider is apple.com
    const provider = decodedToken.firebase?.sign_in_provider;
    if (provider !== "apple.com") {
        throw new Error(`Expected apple.com provider but got: ${provider}`);
    }

    return {
        appleUid: decodedToken.uid,                           // Firebase UID
        email: decodedToken.email || null,
        name: decodedToken.name || null,
    };
};

/**
 * Handle Apple authentication:
 * - Verify Firebase token
 * - Find or create user
 * - Generate JWT tokens
 */
export const handleAppleAuth = async (idToken, clientName) => {
    const { appleUid, email, name } = await verifyAppleFirebaseToken(idToken);

    const displayName = clientName || name || "Apple User";

    // Try to find user by email first (to merge with existing accounts)
    let user = email ? await User.findOne({ email }) : null;
    let newUser = 0;

    if (!user) {
        // Try finding by appleId
        user = await User.findOne({ appleId: appleUid });
    }

    if (!user) {
        // Create new user with Apple provider
        user = await User.create({
            appleId: appleUid,
            email,
            name: displayName,
            providers: ["apple"],
        });
        newUser = 1;
    } else {
        // User exists — merge Apple auth
        if (!user.appleId) {
            user.appleId = appleUid;
        }
        if (!user.name) {
            user.name = displayName;
        }
        if (!user.providers.includes("apple")) {
            user.providers.push("apple");
        }
        await user.save();
        console.log(`Merged Apple auth for user: ${email} (Providers: ${user.providers.join(", ")})`);
    }

    const payload = {
        userId: user._id,
        email: user.email,
    };
    const accessToken = user.generateAccessToken(payload);
    const refreshToken = user.generateRefreshToken(payload);

    return { user, accessToken, refreshToken, newUser };
};
