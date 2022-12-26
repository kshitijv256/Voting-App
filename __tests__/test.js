const request = require("supertest");
const db = require("../models/index");
const app = require("../app");

let server, agent;

describe("Voting App", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(3000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    try {
      await db.sequelize.close();
      await server.close();
    } catch (error) {
      console.log(error);
    }
  });
  test("Adding Election", async () => {
    const res = await agent
      .post("/elections")
      .send({ title: "Test Election", description: "Test Description" });
    expect(res.statusCode).toEqual(302);
  });
});
