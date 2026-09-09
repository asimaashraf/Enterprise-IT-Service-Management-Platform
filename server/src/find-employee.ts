import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import AuthUser from "./modules/auth/auth.model";

dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

const findEmployee = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI!);

    const employee = await AuthUser.findById(
      "6a8a89340c2f45b62c6895b1"
    ).select("name email role organizationId isActive");

    console.log("EMPLOYEE:");
    console.log(employee);

    await mongoose.disconnect();
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

findEmployee();