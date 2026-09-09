import request from "supertest";
import app from "../src/app";

describe("GET /api/v1/auth/me", () => {
  it("should reject unauthenticated requests", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me");

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );
  });
});