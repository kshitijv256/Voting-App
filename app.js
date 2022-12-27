/* eslint-disable no-undef */
// imports

const express = require("express");
// eslint-disable-next-line no-unused-vars
const { Election, Question, Answer } = require("./models");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();

//==================================================

// middleware

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

//==================================================

// get requests

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/elections", async (req, res) => {
  const elections = await Election.findAll();
  res.render("elections", { elections });
});

app.get("/elections/:id", async (req, res) => {
  const election = await Election.findByPk(req.params.id);
  const questions = await Question.findAll({
    where: { electionId: req.params.id },
  });
  res.render("ballot", { election, questions });
});

app.get("/questions/add/:electionId", (req, res) => {
  res.render("add_question", { electionId: req.params.electionId });
});

app.get("/questions/edit/:id", async (req, res) => {
  const question = await Question.findByPk(req.params.id);
  const answers = await Answer.findAll({
    where: { questionId: req.params.id },
  });
  res.render("edit_question", { question, answers });
});
//==================================================

// post requests

app.post("/elections", async (req, res) => {
  console.log(req.body);
  try {
    await Election.create({
      title: req.body.title,
      description: req.body.description,
    });
    res.redirect("/elections");
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post("/questions", async (req, res) => {
  console.log(req.body);
  try {
    await Question.create({
      body: req.body.body,
      selected: null,
      correct: null,
      electionId: req.body.electionId,
    });
    res.redirect(`/elections/${req.body.electionId}`);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post("/questions/:id", async (req, res) => {
  console.log(req.body);
  try {
    await Question.update(
      {
        body: req.body.body,
      },
      {
        where: { id: req.params.id },
      }
    );
    res.redirect(`/elections/${req.body.electionId}`);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});
//==================================================

module.exports = app;
