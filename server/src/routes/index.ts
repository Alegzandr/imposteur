import { Router } from 'express';
import { addRoom } from '../controllers/room';

const router = Router();

router.post('/rooms', addRoom);

export default router;
