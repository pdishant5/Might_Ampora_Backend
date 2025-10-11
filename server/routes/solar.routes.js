import Router from 'express';
import {
    checkSolarStatus
} from '../controllers/solar.controller.js';

const router = Router();

router.get('/check-status', checkSolarStatus);

export default router;