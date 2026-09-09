import { Request, Response } from "express";

import {
  registerUser,
  loginUser,
  bootstrapAdmin,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
} from "./auth.service";

import { AuthRequest } from "../../middleware/auth.middleware";

// ==========================================
// REGISTER
// ==========================================

export const registerController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: "Account created. Please check your email to verify your address before signing in.",
      data: result,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// LOGIN
// ==========================================

export const loginController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await loginUser(req.body);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error: any) {
    const status = error.message.includes("verify")
      ? 403
      : 401;
    res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

export const getCurrentUserController = (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  res.status(200).json({
    success: true,
    data: req.user,
  });
};

// ==========================================
// BOOTSTRAP
// ==========================================

export const bootstrapController = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await bootstrapAdmin(req.body);

    return res.status(201).json({
      success: true,
      message: "Bootstrap administrator created successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// VERIFY EMAIL
// POST /api/v1/auth/verify-email
// Body: { token: string }
// ==========================================

export const verifyEmailController = async (
  req: Request,
  res: Response
) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Verification token is required",
      });
    }

    await verifyEmail(token);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now sign in.",
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// RESEND VERIFICATION EMAIL
// POST /api/v1/auth/resend-verification
// Body: { email: string }
// Returns 200 regardless of whether the email exists.
// ==========================================

export const resendVerificationController = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    await resendVerification(email);

    // Always return 200 to avoid user enumeration.
    return res.status(200).json({
      success: true,
      message: "If that email is registered and unverified, a new verification link has been sent.",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// FORGOT PASSWORD
// POST /api/v1/auth/forgot-password
// Body: { email: string }
// Returns 200 regardless of whether the email exists.
// ==========================================

export const forgotPasswordController = async (
  req: Request,
  res: Response
) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    await requestPasswordReset(email);

    // Always return 200 — never reveal whether the account exists.
    return res.status(200).json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==========================================
// RESET PASSWORD
// POST /api/v1/auth/reset-password
// Body: { token: string; password: string }
// ==========================================

export const resetPasswordController = async (
  req: Request,
  res: Response
) => {
  try {
    const { token, password } = req.body;

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "New password is required",
      });
    }

    await resetPassword(token, password);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now sign in.",
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
