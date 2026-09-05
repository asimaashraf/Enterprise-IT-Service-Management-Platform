import { Request, Response } from "express";

import {
  registerUser,
  loginUser,
  bootstrapAdmin,
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
      message: "User registered successfully",
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
    res.status(401).json({
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