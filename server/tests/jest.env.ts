import dotenv from "dotenv";
import path from "path";

dotenv.config({
	path: path.resolve(process.cwd(), "..", ".env"),
	quiet: true,
});

process.env.NODE_ENV = "test";
process.env.MONGO_URI =
	"mongodb://127.0.0.1:27017/itsm-platform-test";