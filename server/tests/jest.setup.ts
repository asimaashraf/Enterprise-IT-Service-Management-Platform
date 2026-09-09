import {
  connectDB,
  disconnectDB,
} from "../src/config/db";
import { ensureTestFixtures } from "./test-fixtures";

beforeAll(async () => {
  await connectDB();
  await ensureTestFixtures();
}, 30000);

afterAll(async () => {
  try {
    await disconnectDB();

    console.log(
      "\nJest test environment cleanup complete."
    );
  } catch (error) {
    console.error(
      "Jest cleanup failed:",
      error
    );
  }
}, 30000);