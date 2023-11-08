import { Router } from 'express';
import { addRoom, getRooms, getRoom } from '../controllers/room';

const router = Router();

router.post('/rooms', addRoom);
router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoom);

export default router;
