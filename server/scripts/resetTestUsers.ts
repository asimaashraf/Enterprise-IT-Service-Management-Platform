
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

import AuthUser from "../src/modules/auth/auth.model";

dotenv.config();

const testUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);

    console.log("=================================");
    console.log("MONGODB CONNECTED");
    console.log("=================================");

    // ==========================================
    // FIND ADMIN
    // ==========================================

    const admin = await AuthUser.findOne({
      email: "aliya.admin@example.com",
    });

    if (!admin) {
      throw new Error("Admin user was not found");
    }

    console.log("ADMIN FOUND:", admin.email);
    console.log("ADMIN ROLE:", admin.role);
    console.log("ADMIN ACTIVE:", admin.isActive);
    console.log("ADMIN ORGANIZATION:", admin.organizationId.toString());

    // ==========================================
    // TEST CURRENT PASSWORD
    // ==========================================

    const currentPasswordMatch = await bcrypt.compare(
      "Admin@123",
      admin.password
    );

    console.log(
      "CURRENT PASSWORD MATCH:",
      currentPasswordMatch
    );

    // ==========================================
    // RESET ADMIN PASSWORD
    // ==========================================

    const newAdminPassword = await bcrypt.hash(
      "Admin@123",
      10
    );

    admin.password = newAdminPassword;

    await admin.save();

    console.log("ADMIN PASSWORD RESET");

    // ==========================================
    // READ ADMIN AGAIN
    // ==========================================

    const updatedAdmin = await AuthUser.findOne({
      email: "aliya.admin@example.com",
    });

    if (!updatedAdmin) {
      throw new Error("Admin disappeared after update");
    }

    const newPasswordMatch = await bcrypt.compare(
      "Admin@123",
      updatedAdmin.password
    );

    console.log(
      "NEW PASSWORD MATCH:",
      newPasswordMatch
    );

    // ==========================================
    // FIND EMPLOYEE
    // ==========================================

    const employee = await AuthUser.findOne({
      email: "employee.test@example.com",
    });

    if (!employee) {
      throw new Error("Employee user was not found");
    }

    console.log("EMPLOYEE FOUND:", employee.email);
    console.log("EMPLOYEE ROLE:", employee.role);
    console.log(
      "EMPLOYEE ACTIVE:",
      employee.isActive
    );

    // ==========================================
    // RESET EMPLOYEE PASSWORD
    // ==========================================

    const newEmployeePassword = await bcrypt.hash(
      "Employee@123",
      10
    );

    employee.password = newEmployeePassword;

    await employee.save();

    const updatedEmployee = await AuthUser.findOne({
      email: "employee.test@example.com",
    });

    if (!updatedEmployee) {
      throw new Error("Employee disappeared after update");
    }

    const employeePasswordMatch = await bcrypt.compare(
      "Employee@123",
      updatedEmployee.password
    );

    console.log(
      "EMPLOYEE PASSWORD MATCH:",
      employeePasswordMatch
    );

    console.log("=================================");
    console.log("TEST USER CHECK COMPLETE");
    console.log("=================================");

    await mongoose.connection.close();

    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("ERROR:", error);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
};

testUsers();
