import admin from "firebase-admin";
import { User } from "../models/user.model.js";

/**
 * Verify a Firebase ID token obtained from Apple Sign-In on the client.
 * Firebase Auth handles Apple token verification, so we just verify the
 * Firebase ID token that the Flutter client sends us after
 * FirebaseAuth.signInWithCredential().
 *
 * NOTE: Apple only sends email/name on the FIRST sign-in. On subsequent
 * sign-ins, and when the user chooses "Hide My Email", email may be null.
 * We must always be able to identify users by their Firebase UID (appleId).
 */
export const verifyAppleFirebaseToken = async (idToken) => {
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Ensure the sign-in provider is apple.com
    const provider = decodedToken.firebase?.sign_in_provider;
    if (provider !== "apple.com") {
        throw new Error(`Expected apple.com provider but got: ${provider}`);
    }

    // email may be null if user chose "Hide My Email" or on 2nd+ sign-in
    const rawEmail = decodedToken.email || null;
    // Ignore Apple's private relay emails as a lookup key — treat as no email
    // so we always fall back to appleId lookup.
    const email = rawEmail && !rawEmail.endsWith('@privaterelay.appleid.com')
        ? rawEmail
        : null;

    return {
        appleUid: decodedToken.uid,   // Firebase UID — always present
        email,
        name: decodedToken.name || null,
    };
};

/**
 * Handle Apple authentication:
 * - Verify Firebase token
 * - Find or create user  (always look up by appleId first to handle hidden email)
 * - Generate JWT tokens
 */
export const handleAppleAuth = async (idToken, clientName) => {
    const { appleUid, email, name } = await verifyAppleFirebaseToken(idToken);

    const displayName = clientName || name || null;

    let user = null;
    let newUser = 0;

    // ── Step 1: Look up by appleId first (works on every sign-in, even with hidden email)
    user = await User.findOne({ appleId: appleUid });

    // ── Step 2: If not found by appleId, try merging with existing email account
    if (!user && email) {
        user = await User.findOne({ email });
        if (user) {
            console.log(`Apple sign-in: merging with existing email account: ${email}`);
        }
    }

    if (!user) {
        // ── Step 3: Create new user
        // IMPORTANT: Do NOT store email: null — omit it so the sparse unique
        // index does not treat all null-email users as duplicates.
        const createData = {
            appleId: appleUid,
            providers: ["apple"],
        };
        if (displayName) createData.name = displayName;
        if (email) createData.email = email;

        user = await User.create(createData);
        newUser = 1;
        console.log(`Apple sign-in: created new user. appleId=${appleUid}, email=${email ?? '(hidden)'}`);
    } else {
        // ── Step 4: Merge into existing user
        if (!user.appleId) {
            user.appleId = appleUid;
        }
        // Only update name if one was supplied and user has none
        if (!user.name && displayName) {
            user.name = displayName;
        }
        // Only update email if we have one and user has none
        if (!user.email && email) {
            user.email = email;
        }
        if (!user.providers.includes("apple")) {
            user.providers.push("apple");
        }
        await user.save();
        console.log(`Apple sign-in: existing user. appleId=${appleUid}, email=${email ?? '(hidden)'}`);
    }

    const payload = {
        userId: user._id,
        // email may be undefined/null for hidden-email users — that is fine for JWT
        ...(user.email ? { email: user.email } : {}),
    };
    const accessToken = user.generateAccessToken(payload);
    const refreshToken = user.generateRefreshToken(payload);

    return { user, accessToken, refreshToken, newUser };
};
