const request = require("supertest");
const db = require("../models/index");
const app = require("../app");
let cheerio = require("cheerio");

let server, agent;
function extractCsrfToken(res) {
  let $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

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
    let res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/elections").send({
      title: "Test Election",
      description: "Test Description",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toEqual(302);
  });

  test("Adding Question", async () => {
    let res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);
    const election = await db.Election.findOne();
    res = await agent.post("/questions").send({
      title: "Test Question",
      description: "Test Description",
      selected: null,
      correct: null,
      electionId: election.id,
      _csrf: csrfToken,
    });
    expect(res.statusCode).toEqual(302);
  });

  test("Updating Question", async () => {
    let res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);
    const question = await db.Question.findOne();
    const id = question.id;
    res = await agent.post(`/questions/${question.id}`).send({
      title: "Updated Question",
      description: "Updated Description",
      _csrf: csrfToken,
    });
    expect(res.statusCode).toEqual(302);

    const updatedQuestion = await db.Question.findByPk(id);
    expect(updatedQuestion.title).toEqual("Updated Question");
    expect(updatedQuestion.description).toEqual("Updated Description");
  });
});
