import { Router } from "express";

import {
  registerController,
  bootstrapController,
  loginController,
  getCurrentUserController,
  verifyEmailController,
  resendVerificationController,
  forgotPasswordController,
  resetPasswordController,
} from "./auth.controller";

import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

// ==========================================
// AUTH ROUTES
// ==========================================

// REGISTER
router.post("/register", registerController);

// BOOTSTRAP
router.post("/bootstrap", bootstrapController);

// LOGIN
router.post("/login", loginController);

// CURRENT USER
router.get("/me", authenticate, getCurrentUserController);

// ==========================================
// EMAIL VERIFICATION
// ==========================================

// Verify email address (clicking the link in the email).
router.post("/verify-email", verifyEmailController);

// Resend verification email (from login screen).
router.post("/resend-verification", resendVerificationController);

// ==========================================
// PASSWORD RESET
// ==========================================

// Request a password-reset email.
router.post("/forgot-password", forgotPasswordController);

// Complete the password reset with the token from the email.
router.post("/reset-password", resetPasswordController);

export default router;
