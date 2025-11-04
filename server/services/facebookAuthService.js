import axios from "axios";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/apiError.js";

export const verifyFacebookToken = async (accessToken) => {
    try {
        const response = await axios.get(
            `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
        );

        const { id, email, name } = response.data;

        return {
            facebookId: id,
            email,
            name
        };
    } catch (error) {
        throw new ApiError(400, "Invalid Facebook access token!");
    }
};

export const handleFacebookAuth = async (accessToken) => {
    const { facebookId, email, name } = await verifyFacebookToken(accessToken);

    if (!email) {
        throw new ApiError(400, "Facebook account does not provide email!");
    }

    let user = await User.findOne({ email });
    let newUser = 0;

    if (!user) {
        user = await User.create({
            facebookId,
            email,
            name,
            provider: "facebook"
        });
        newUser = 1;
    } else if (!user.facebookId) {
        user.facebookId = facebookId;
        await user.save();
    }

    const payload = {
        userId: user._id,
        email: user.email
    };
    const jwtAccessToken = user.generateRefreshToken(payload);
    const refreshToken = user.generateRefreshToken(payload);

    return { user, jwtAccessToken, refreshToken, newUser };
};
