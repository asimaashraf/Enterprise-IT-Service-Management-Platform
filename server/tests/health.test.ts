import request from "supertest";
import app from "../src/app";

describe("ITSM Health API", () => {
  it("should return a successful health response", async () => {
    const response = await request(app)
      .get("/api/v1/health");

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      success: true,
      message: "ITSM API is running",
    });
  });
});