/* eslint-disable no-undef */
// imports

const express = require("express");
const csrf = require("csurf"); // using csrf
const cookieParser = require("cookie-parser");
const passport = require("passport"); // using passport
const LocalStrategy = require("passport-local"); // using passport-local as strategy
const session = require("express-session");
const connectEnsureLogin = require("connect-ensure-login");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const flash = require("connect-flash");
const { Election, Question, Answer, Admin } = require("./models");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();

//==================================================

// middleware

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(flash());

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser("some other secret string"));
// ["POST", "PUT", "DELETE"]));
app.use(csrf({ cookie: true }));

app.use(express.static(path.join(__dirname, "public")));
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
      Admin.findOne({
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
  Admin.findByPk(id)
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

app.get("/", async function (req, res) {
  if (req.user) {
    return res.redirect("/elections");
  } else {
    return res.render("landing", {
      csrfToken: req.csrfToken(),
    });
  }
});

app.get("/signup", (req, res) => {
  return res.render("signup", { csrfToken: req.csrfToken() });
});

app.get("/login", (req, res) => {
  res.render("login", { csrfToken: req.csrfToken() });
});

app.get("/logout", (request, response, next) => {
  request.logout((err) => {
    if (err) return next(err);
    response.redirect("/login");
  });
});

app.get("/elections", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const adminId = req.user.id;
  const admin = await Admin.findByPk(adminId);
  const name = admin.firstName + " " + admin.lastName;
  const elections = await Election.findAll(
    {
      where: { adminId: adminId },
    },
    { order: [["id", "ASC"]] }
  );
  if (req.accepts("html")) {
    res.render("elections", { elections, name, csrfToken: req.csrfToken() });
  } else {
    res.json({ elections });
  }
});

app.get("/elections/add", connectEnsureLogin.ensureLoggedIn(), (req, res) => {
  res.render("add_elections", {
    adminId: req.user.id,
    csrfToken: req.csrfToken(),
  });
});

app.get(
  "/elections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const election = await Election.findByPk(req.params.id);
    const questions = await Question.findAll({
      where: { electionId: req.params.id },
    });
    if (req.accepts("html")) {
      res.render("ballot", {
        election,
        questions,
        csrfToken: req.csrfToken(),
      });
    } else {
      res.json({ election, questions });
    }
  }
);

app.get(
  "/questions/add/:electionId",
  connectEnsureLogin.ensureLoggedIn(),
  (req, res) => {
    res.render("add_question", {
      electionId: req.params.electionId,
      csrfToken: req.csrfToken(),
    });
  }
);

app.get(
  "/questions/edit/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const question = await Question.findByPk(req.params.id);
    const answers = await Answer.findAll({
      where: { questionId: req.params.id },
      order: [["id", "ASC"]],
    });
    if (req.accepts("html")) {
      res.render("edit_question", {
        question,
        answers,
        csrfToken: req.csrfToken(),
      });
    } else {
      res.json({ question, answers });
    }
  }
);

app.get(
  "/answers/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const question = await Question.findByPk(req.params.id);
    res.render("add_answer", { question, csrfToken: req.csrfToken() });
  }
);

//==================================================

// post requests

app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    response.redirect("/elections");
  }
);

app.post("/admins", async (req, res) => {
  console.log(req.body);
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
    const user = await Admin.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hashedPassword,
    });
    req.login(user, (err) => {
      if (err) {
        console.log(err);
        res.sendStatus(500);
      }
      res.redirect("/elections");
    });
  } catch (error) {
    console.log(error);
    res.redirect("/signup");
  }
});

app.post(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    try {
      await Election.create({
        title: req.body.title,
        description: req.body.description,
        adminId: req.user.id,
      });
      res.redirect("/elections");
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

app.post(
  "/questions",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    try {
      await Question.create({
        title: req.body.title,
        description: req.body.description,
        selected: null,
        correct: null,
        electionId: req.body.electionId,
      });
      return res.redirect(`/elections/${req.body.electionId}`);
    } catch (error) {
      console.log(error);
      return res.sendStatus(422).json(error);
    }
  }
);

app.post(
  "/questions/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
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
      return res.redirect(`/elections/${req.body.electionId}`);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
);

app.post(
  "/answers/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    try {
      await Answer.create({
        body: req.body.body,
        selected: req.body.selected,
        questionId: req.params.id,
      });
      return res.redirect(`/questions/edit/${req.params.id}`);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
);

app.post(
  "/answers/edit/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
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
      return res.redirect(`/questions/edit/${req.body.questionId}`);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
);

//==================================================
// put requests

app.put(
  "/answers/edit/:id/",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    try {
      const answer = await Answer.findByPk(req.params.id);
      const updatedQuestion = await Question.update(
        {
          correct: req.params.id,
        },
        {
          where: { id: answer.questionId },
        }
      );
      return res.json(updatedQuestion);
    } catch (error) {
      console.log(error);
      return res.status(422).json(error);
    }
  }
);

//==================================================
// delete requests

app.delete(
  "/elections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    try {
      await Election.destroy({
        where: { id: req.params.id },
      });
      return res.json({ success: true });
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

app.delete(
  "/questions/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    try {
      await Question.destroy({
        where: { id: req.params.id },
      });
      return res.json({ success: true });
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

app.delete(
  "/answers/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    try {
      await Answer.destroy({
        where: { id: req.params.id },
      });
      return res.json({ success: true });
    } catch (error) {
      console.log(error);
      res.sendStatus(500);
    }
  }
);

//==================================================

module.exports = app;

//==================================================

//Add delete option for questions

// Add delete option for answers

// add correct answer option for questions X
