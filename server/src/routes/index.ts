import { Router } from 'express';
import {
    addRoom,
    getRooms,
    getRoom,
    getCurrentWord,
} from '../controllers/room';

const router = Router();

router.post('/rooms', addRoom);
router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoom);
router.post('/rooms/:id/word', getCurrentWord);

export default router;
