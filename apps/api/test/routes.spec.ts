import request from "supertest";

const API = "http://localhost:4000";

describe("API Routes", () => {
    it("healthz", async () => {
        const res = await request(API).get("/healthz");
        expect(res.status).toBe(200);
    });
    it("openapi", async () => {
        const res = await request(API).get("/openapi.json");
        expect(res.status).toBe(200);
    });
});
