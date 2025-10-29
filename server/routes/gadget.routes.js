import Router from 'express';
import multer from 'multer';
import {
    recognizeGadget
} from '../controllers/gadget.controller.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/recognize', upload.single('image'), recognizeGadget);

export default router;