const request = require("supertest");
const db = require("../models/index");
const app = require("../app");
let cheerio = require("cheerio");

let server, agent;
function extractCsrfToken(res) {
  let $ = cheerio.load(res.text);
  return $("[name=_csrf]").val();
}

const login = async (agent, username, password) => {
  let res = await agent.get("/login");
  let csrfToken = extractCsrfToken(res);
  res = await agent.post("/session").send({
    email: username,
    password: password,
    _csrf: csrfToken,
  });
};

describe("Voting App", function () {
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

  test("Sign up", async () => {
    let res = await agent.get("/signup");
    const csrfToken = extractCsrfToken(res);
    try {
      res = await agent.post("/admins").send({
        _csrf: csrfToken,
        firstName: "Test",
        lastName: "User 1",
        email: "user1@test.com",
        password: "password",
      });
      expect(res.statusCode).toBe(302);
    } catch (error) {
      console.log(error);
    }
  });

  test("Sign out", async () => {
    let res = await agent.get("/elections");
    expect(res.statusCode).toBe(200);
    res = await agent.get("/logout");
    expect(res.statusCode).toBe(302);
    res = await agent.get("/elections");
    expect(res.statusCode).toBe(302);
  });

  test("Adding Election", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    // console.log(request.user.id);
    const res = await agent.get("/login");
    // console.log(res);
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/elections").send({
      title: "Test Election",
      description: "Test Description",
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(302);
  });

  test("Adding Question", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    let res = await agent.get("/login");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/questions").send({
      title: "Test Question",
      description: "Test Description",
      electionId: 1,
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
    const questions = await agent
      .get("/elections/1")
      .set("Accept", "application/json")
      .then((response) => {
        const parsedResponse = JSON.parse(response.text);
        return parsedResponse.questions;
      });
    expect(questions.length).toBe(1);
  });

  test("Updating Question", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    let res = await agent.get("/login");
    const csrfToken = extractCsrfToken(res);
    const id = 1;
    res = await agent.post(`/questions/${id}`).send({
      title: "Updated Question",
      description: "Updated Description",
      electionId: 1,
      _csrf: csrfToken,
    });
    expect(res.statusCode).toEqual(302);

    const questions = await agent
      .get("/elections/1")
      .set("Accept", "application/json")
      .then((response) => {
        const parsedResponse = JSON.parse(response.text);
        return parsedResponse.questions;
      });
    const updatedQuestion = questions[0];
    expect(updatedQuestion.title).toEqual("Updated Question");
    expect(updatedQuestion.description).toEqual("Updated Description");
  });

  test("Adding Option", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    let res = await agent.get("/login");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/answers/1").send({
      body: "Test Option",
      _csrf: csrfToken,
      questionId: 1,
    });
    expect(res.statusCode).toBe(302);
  });

  test("Updating Option", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    let res = await agent.get("/login");
    const csrfToken = extractCsrfToken(res);
    res = await agent.post("/answers/edit/1").send({
      body: "Updated Option",
      questionId: 1,
      _csrf: csrfToken,
    });
    expect(res.statusCode).toBe(302);
    const answers = await agent
      .get("/questions/edit/1")
      .set("Accept", "application/json")
      .then((response) => {
        const parsedResponse = JSON.parse(response.text);
        return parsedResponse.answers;
      });
    const updatedAnswer = answers[0];
    expect(updatedAnswer.body).toEqual("Updated Option");
  });

  test("Deleting Option", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    let res = await agent.get("/login");
    const csrfToken = extractCsrfToken(res);
    res = await agent.delete("/answers/1").send({
      _csrf: csrfToken,
    });
    const parsedResponse = JSON.parse(res.text);
    expect(parsedResponse.success).toBe(true);
  });

  test("Deleting Question", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    let res = await agent.get("/login");
    let csrfToken = extractCsrfToken(res);
    res = await agent.post("/questions").send({
      title: "Test Question 2",
      description: "Test Description 2",
      electionId: 1,
      _csrf: csrfToken,
    });
    res = await agent.delete("/questions/1").send({
      _csrf: csrfToken,
    });
    const parsedResponse = JSON.parse(res.text);
    expect(parsedResponse.success).toBe(true);
  });

  test("Deleting Election", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    let res = await agent.get("/login");
    const csrfToken = extractCsrfToken(res);
    res = await agent.delete("/elections/1").send({
      _csrf: csrfToken,
    });
    const parsedResponse = JSON.parse(res.text);
    expect(parsedResponse.success).toBe(true);
  });

  test("Adding voter", async () => {
    const agent = request.agent(server);
    await login(agent, "user1@test.com", "password");
    let res = await agent.get("/login");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/elections").send({
      title: "Test Election",
      description: "Test Description",
      _csrf: csrfToken,
    });
    res = await agent.get("/login");
    csrfToken = extractCsrfToken(res);
    res = await agent.post("/voters").send({
      firstName: "Test",
      lastName: "Voter",
      voterID: "123456789",
      password: "password",
      _csrf: csrfToken,
      electionId: 2,
    });
    expect(res.statusCode).toBe(302);
  });
});
