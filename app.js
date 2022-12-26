// imports

const express = require("express");
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
//==================================================

// post requests

app.post("/elections", (req, res) => {
  console.log(req.body);
  try {
    Election.create({
      title: req.body.title,
      description: req.body.description,
    });
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//==================================================

module.exports = app;
