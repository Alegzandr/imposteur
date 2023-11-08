import { Router } from 'express';
import { addRoom, getRooms } from '../controllers/room';

const router = Router();

router.post('/rooms', addRoom);
router.get('/rooms', getRooms);

export default router;
