/* eslint-disable no-undef */
// imports

const express = require("express");
const csrf = require("csurf"); // using csrf
const cookieParser = require("cookie-parser");
const passport = require("passport"); // using passport
const LocalStrategy = require("passport-local"); // using passport-local as strategy
const session = require("express-session");
// const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
// const saltRounds = 10;
const flash = require("connect-flash");
// eslint-disable-next-line no-unused-vars
const { Election, Question, Answer } = require("./models");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();

//==================================================

// middleware

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(flash());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(cookieParser("some other secret string"));
// ["POST", "PUT", "DELETE"]));
app.use(csrf({ cookie: true }));

app.use(
  session({
    secret: "secret-key-that-no-one-can-guess",
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// passport config
app.use(passport.initialize());
app.use(passport.session());

// authentication
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({
        where: {
          email: username,
        },
      })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Incorrect password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "User does not exists" });
        });
    }
  )
);
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

//==================================================

// get requests

app.get("/", async function (request, response) {
  if (request.user) {
    return response.render("index", {
      csrfToken: request.csrfToken(),
    });
  } else {
    return response.render("landing", {
      csrfToken: request.csrfToken(),
    });
  }
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

app.get("/answers/:id", async (req, res) => {
  const question = await Question.findByPk(req.params.id);
  res.render("add_answer", { question });
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
      title: req.body.title,
      description: req.body.description,
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
        title: req.body.title,
        description: req.body.description,
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

app.post("/answers/:id", async (req, res) => {
  console.log(req.body);
  try {
    await Answer.create({
      body: req.body.body,
      selected: req.body.selected,
      questionId: req.params.id,
    });
    res.redirect(`/questions/edit/${req.params.id}`);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post("/answers/edit/:id", async (req, res) => {
  console.log(req.body);
  try {
    await Answer.update(
      {
        body: req.body.body,
      },
      {
        where: { id: req.params.id },
      }
    );
    res.redirect(`/questions/edit/${req.body.questionId}`);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//==================================================
// put requests

app.put("/answers/edit/:id", async (req, res) => {
  console.log(req.body);
  try {
    const answer = await Answer.findByPk(req.params.id);
    const question = await Question.findByPk(answer.questionId);
    await Question.update(
      {
        correct: req.params.id,
      },
      {
        where: { id: question.id },
      }
    );
    res.redirect(`/questions/edit/${req.body.questionId}`);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//==================================================
// delete requests

app.delete("/questions/:id", async (req, res) => {
  console.log(req.body);
  try {
    await Question.findByPk(req.params.id);
    await Question.destroy({
      where: { id: req.params.id },
    });
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.delete("/answers/:id", async (req, res) => {
  console.log(req.body);
  try {
    await Answer.findByPk(req.params.id);
    await Answer.destroy({
      where: { id: req.params.id },
    });
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

//==================================================

module.exports = app;

//==================================================

//Add delete option for questions

// Add delete option for answers

// add correct answer option for questions X
