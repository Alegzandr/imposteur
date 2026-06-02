import { Router } from 'express';
import { addRoom, getRooms, getRoomById } from '../controllers/room';

const router = Router();

router.post('/rooms', addRoom);
router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoomById);

export default router;
