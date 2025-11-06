import Router from 'express';
import { upload } from '../config/multer.js';
import {
    recognizeGadget,
    getEstimatedWattage
} from '../controllers/gadget.controller.js';

const router = Router();

router.post('/recognize', upload.single('image'), recognizeGadget);
router.post("/estimate-wattage", getEstimatedWattage);

export default router;