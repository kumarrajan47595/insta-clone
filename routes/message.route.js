import express from 'express';
import isAuthenticated from '../middlewares/isAuthenticated.js';
import { getMessage, sendMessage } from '../controllers/message.controller.js';

const router=express.Router();

router.route('/sendmessage/:id').post(isAuthenticated,sendMessage);
router.route('/getmessage/:id').get(isAuthenticated,getMessage);

export default router;