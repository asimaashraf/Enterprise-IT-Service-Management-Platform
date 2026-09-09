import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env" });

describe("MongoDB connection", () => {
  it("should connect to MongoDB Atlas", async () => {
    console.log("MONGO URI LOADED:", Boolean(process.env.MONGO_URI));

    await mongoose.connect(process.env.MONGO_URI!, {
      serverSelectionTimeoutMS: 60000,
    });

    console.log("MONGODB CONNECTED:", mongoose.connection.host);
    console.log("READY STATE:", mongoose.connection.readyState);

    expect(mongoose.connection.readyState).toBe(1);

    await mongoose.disconnect();
  }, 70000);
});
