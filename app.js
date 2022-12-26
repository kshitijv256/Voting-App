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
//==================================================

// post requests

app.post("/elections", (req, res) => {
  console.log(req.body);
  try {
    Election.create({
      title: req.body.title,
      description: req.body.description,
    });
    res.redirect("/elections");
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//==================================================

module.exports = app;
