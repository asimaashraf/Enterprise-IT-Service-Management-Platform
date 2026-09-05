
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { IAuthUser } from "./auth.model";
import { authRepository } from "./auth.repository";
import { organizationRepository } from "../organization/organization.repository";

interface RegisterUserData {
  name: string;
  email: string;
  password: string;
  organizationId: string;
  role?: "admin" | "employee";
}

interface LoginUserData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "employee";
    organizationId: string;
  };
  token: string;
}

interface BootstrapData {
  bootstrapToken: string;
  organizationName: string;
  organizationSlug: string;
  organizationDescription?: string;
  name: string;
  email: string;
  password: string;
}

export const bootstrapAdmin = async (
  data: BootstrapData
): Promise<AuthResponse> => {
  if (!process.env.BOOTSTRAP_TOKEN) {
    throw new Error("Bootstrap is not configured");
  }

  if (data.bootstrapToken !== process.env.BOOTSTRAP_TOKEN) {
    throw new Error("Invalid bootstrap token");
  }

  if ((await authRepository.countUsers()) > 0) {
    throw new Error("Bootstrap is already completed");
  }

  const organization = await organizationRepository.create({
    name: data.organizationName,
    slug: data.organizationSlug,
    description: data.organizationDescription,
  });

  try {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await authRepository.create({
      name: data.name,
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      role: "admin",
      organizationId: organization._id,
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: organization._id.toString(),
      },
      token: generateToken(user),
    };
  } catch (error) {
    await organizationRepository.deleteById(organization._id.toString());
    throw error;
  }
};

// ==========================================
// REGISTER USER
// ==========================================

export const registerUser = async (
  data: RegisterUserData
): Promise<AuthResponse> => {
  const existingUser = await authRepository.findOne({
    email: data.email.toLowerCase(),
  });

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }

  const organization = await organizationRepository.findById(
    data.organizationId
  );

  if (!organization) {
    throw new Error("Organization not found");
  }

  if (!organization.isActive) {
    throw new Error("Organization is inactive");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await authRepository.create({
    name: data.name,
    email: data.email.toLowerCase(),
    password: hashedPassword,

    // Public registration must never grant administrative access.
    // Client-provided roles are intentionally ignored.
    role: "employee",

    organizationId: new mongoose.Types.ObjectId(
      data.organizationId
    ),
  });

  const token = generateToken(user);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
    },
    token,
  };
};

// ==========================================
// LOGIN USER
// ==========================================

export const loginUser = async (
  data: LoginUserData
): Promise<AuthResponse> => {
  const user = await authRepository.findOne({
    email: data.email.toLowerCase(),
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("User account is inactive");
  }

  const organization = await organizationRepository.findById(
    user.organizationId.toString()
  );

  if (!organization) {
    throw new Error("Organization not found");
  }

  if (!organization.isActive) {
    throw new Error("Organization is inactive");
  }

  const passwordMatch = await bcrypt.compare(
    data.password,
    user.password
  );

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  const token = generateToken(user);

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
    },
    token,
  };
};

// ==========================================
// GENERATE JWT
// ==========================================

const generateToken = (user: IAuthUser): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      organizationId: user.organizationId.toString(),
    },
    secret,
    {
      expiresIn: "7d",
    }
  );
};
