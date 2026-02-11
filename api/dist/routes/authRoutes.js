"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const passwordResetController_1 = require("../controllers/passwordResetController");
const router = (0, express_1.Router)();
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.get('/me', authMiddleware_1.protect, authController_1.getMe);
// Password recovery routes
router.post('/forgot-password', passwordResetController_1.passwordResetController.forgotPassword);
router.get('/reset-password/validate', passwordResetController_1.passwordResetController.validateToken);
router.post('/reset-password', passwordResetController_1.passwordResetController.resetPassword);
exports.default = router;
