import Router from 'express';
import {
    facebookSignIn,
    googleSignIn,
    logoutUser,
    refreshAccessToken,
    signInWithOTP,
    verifyOTP,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/google', googleSignIn);
router.post('/facebook', facebookSignIn);
router.post('/request-otp', signInWithOTP);
router.post('/verify-otp', verifyOTP);

router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logoutUser);

export default router;