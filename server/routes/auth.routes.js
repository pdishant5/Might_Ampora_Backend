import Router from 'express';
import {
    deleteAccount,
    facebookSignIn,
    getUserProfile,
    googleSignIn,
    logoutUser,
    refreshAccessToken,
    requestOTP,
    signInWithOTP,
    verifyOTP,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/google', googleSignIn);
router.post('/facebook', facebookSignIn);
router.post('/request-otp', requestOTP);
router.post('/verify-otp', verifyOTP);
router.post('/otp-signup', signInWithOTP);
router.post('/profile', getUserProfile);

router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logoutUser);
router.post('/delete-account', deleteAccount);

export default router;