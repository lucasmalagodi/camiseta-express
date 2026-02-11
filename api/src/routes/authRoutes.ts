import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';
import { passwordResetController } from '../controllers/passwordResetController';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

// Password recovery routes
router.post('/forgot-password', passwordResetController.forgotPassword);
router.get('/reset-password/validate', passwordResetController.validateToken);
router.post('/reset-password', passwordResetController.resetPassword);

export default router;
