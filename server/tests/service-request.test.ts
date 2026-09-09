import request from "supertest";
import app from "../src/app";

describe("Service Request API", () => {
  it("should reject unauthenticated service request creation", async () => {
    const response = await request(app)
      .post("/api/v1/service-requests")
      .send({});

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );

    expect(response.body).toHaveProperty(
      "message"
    );
  });

  it("should reject unauthenticated service request listing", async () => {
    const response = await request(app)
      .get("/api/v1/service-requests");

    expect(response.status).toBe(401);

    expect(response.body).toHaveProperty(
      "success",
      false
    );
  });
});