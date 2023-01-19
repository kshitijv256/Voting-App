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
const { Election, Question, Answer, Admin, Voter } = require("./models");
const path = require("path");
const bodyParser = require("body-parser");
const app = express();
const Sequelize = require("sequelize");

//==================================================
//============ MIDDLEWARE ==========================

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
    resave: false,
    saveUninitialized: false,
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

async function authencticateVoter(voterID, password) {
  return await Voter.findOne({
    where: {
      voterID: voterID,
    },
  })
    .then(async (user) => {
      const result = password == user.password;
      if (result) {
        return user;
      } else {
        return false;
      }
    })
    .catch(() => {
      return false;
    });
}

async function verifyVoter(voterID, password, electionURL) {
  const voter = await authencticateVoter(voterID, password);
  if (!voter) {
    return false;
  }
  return Election.findOne({
    where: {
      customURL: electionURL,
    },
  })
    .then(async (election) => {
      const result = election.id == voter.electionId;
      if (result) {
        return true;
      } else {
        return false;
      }
    })
    .catch(() => {
      return false;
    });
}

//==================================================
//============ GET REQUESTS ========================

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
  const elections = await Election.findAll({
    where: { adminId: adminId },
    include: [Question],
    order: [["id", "ASC"]],
  });
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
      include: [Answer],
      order: [[Answer, "id", "ASC"]],
    });
    const voters = await Voter.findAll({
      where: { electionId: req.params.id },
    });
    if (req.accepts("html")) {
      res.render("ballot", {
        election,
        questions,
        voters,
        csrfToken: req.csrfToken(),
      });
    } else {
      res.json({ election, questions, voters });
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
    const election = await Election.findByPk(question.electionId);
    const answers = await Answer.findAll({
      where: { questionId: req.params.id },
      order: [["id", "ASC"]],
    });
    if (req.accepts("html")) {
      res.render("edit_question", {
        question,
        answers,
        election,
        csrfToken: req.csrfToken(),
      });
    } else {
      res.json({ question, answers });
    }
  }
);

app.get(
  "/answers/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const question = await Question.findByPk(req.params.questionId);
    res.render("add_answer", { question, csrfToken: req.csrfToken() });
  }
);

app.get(
  "/voters/add/:electionId",
  connectEnsureLogin.ensureLoggedIn(),
  (req, res) => {
    res.render("add_voter", {
      electionId: req.params.electionId,
      csrfToken: req.csrfToken(),
    });
  }
);

app.get("/e/:customURL", async (req, res) => {
  const election = await Election.findOne({
    where: { customURL: req.params.customURL },
    include: [
      {
        model: Question,
        include: [Answer],
      },
    ],
    order: [[Question, Answer, "id", "ASC"]],
  });

  if (election.state == "running") {
    res.render("voter_login", {
      electionName: election.title,
      electionURL: req.params.customURL,
      csrfToken: req.csrfToken(),
    });
  } else {
    let voterCount;
    let results = [];
    for (let i = 0; i < election.Questions.length; i++) {
      const question = election.Questions[i];
      let temp = [];
      voterCount = 0;
      for (let j = 0; j < question.Answers.length; j++) {
        const answer = question.Answers[j];
        temp.push([j + 1, answer.votes]);
        voterCount += answer.votes;
      }
      results.push(temp);
    }
    res.render("results", {
      voterCount,
      election: election,
      electionURL: req.params.customURL,
      csrfToken: req.csrfToken(),
    });
  }
});

app.get(
  "/election/launch/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const election = await Election.findByPk(req.params.id, {
      include: [
        {
          model: Question,
          include: [Answer],
        },
      ],
      order: [[Question, Answer, "id", "ASC"]],
    });
    res.render("launch_election", {
      election: election,
      csrfToken: req.csrfToken(),
    });
  }
);

app.get("/election/:id/results", async (req, res) => {
  const election = await Election.findByPk(req.params.id, {
    include: [
      {
        model: Question,
        include: [Answer],
      },
    ],
    order: [[Question, Answer, "id", "ASC"]],
  });
  let voterCount;
  let results = [];
  for (let i = 0; i < election.Questions.length; i++) {
    const question = election.Questions[i];
    let temp = [];
    voterCount = 0;
    for (let j = 0; j < question.Answers.length; j++) {
      const answer = question.Answers[j];
      temp.push([j + 1, answer.votes]);
      voterCount += answer.votes;
    }
    results.push(temp);
  }
  res.render("results", {
    voterCount,
    election: election,
    csrfToken: req.csrfToken(),
  });
});

app.get("/newpass", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  const admin = await Admin.findByPk(req.user.id);
  res.render("newpassword", {
    user: admin,
    csrfToken: req.csrfToken(),
  });
});

//==================================================
//================== POST REQUESTS =================

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
  if (req.body.firstName == "") {
    req.flash("error", "First Name is required");
    return res.redirect("/signup");
  }
  if (req.body.email == "") {
    req.flash("error", "Invalid Email");
    return res.redirect("/signup");
  }
  if (req.body.password.length < 6) {
    req.flash("error", "Password must be at least 6 characters");
    return res.redirect("/signup");
  }
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
    req.flash("error", "Email already registered");
    res.redirect("/signup");
  }
});

app.post(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    if (req.body.title == "") {
      req.flash("error", "Election title is required");
      return res.redirect("/elections/add");
    }
    if (req.body.description == "") {
      req.flash("error", "Election description is required");
      return res.redirect("/elections/add");
    }
    try {
      await Election.create({
        title: req.body.title,
        description: req.body.description,
        status: "new",
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
    const election = await Election.findByPk(req.body.electionId);
    if (election.state == "running") {
      req.flash("error", "Election is already running");
      return res.redirect(`/questions/add/${req.body.electionId}`);
    }
    if (req.body.title == "") {
      req.flash("error", "Question title is required");
      return res.redirect(`/questions/add/${req.body.electionId}`);
    }
    if (req.body.description == "") {
      req.flash("error", "Question description is required");
      return res.redirect(`/questions/add/${req.body.electionId}`);
    }
    try {
      await Question.create({
        title: req.body.title,
        description: req.body.description,
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
    const election = await Election.findByPk(req.body.electionId);
    if (election.state == "running") {
      req.flash("error", "Election is already running");
      return res.redirect(`/questions/edit/${req.params.id}`);
    }
    if (req.body.title == "") {
      req.flash("error", "Question title is required");
      return res.redirect(`/questions/edit/${req.params.id}`);
    }
    if (req.body.description == "") {
      req.flash("error", "Question description is required");
      return res.redirect(`/questions/edit/${req.params.id}`);
    }
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
  "/answers/:questionId",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    const question = await Question.findByPk(req.params.questionId);
    const election = await Election.findByPk(question.electionId);
    if (election.state == "running") {
      req.flash("error", "Election is already running");
      return res.redirect(`/answers/${req.params.questionId}`);
    }
    if (req.body.body == "") {
      req.flash("error", "Answer body is required");
      return res.redirect(`/answers/${req.params.questionId}`);
    }
    try {
      await Answer.create({
        body: req.body.body,
        votes: 0,
        questionId: req.params.questionId,
      });
      return res.redirect(`/questions/edit/${req.params.questionId}`);
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
    const question = await Question.findByPk(req.body.questionId);
    const election = await Election.findByPk(question.electionId);
    if (election.state == "running") {
      req.flash("error", "Election is already running");
      return res.redirect(`/questions/edit/${req.body.questionId}`);
    }
    if (req.body.body == "") {
      req.flash("error", "Answer body is required");
      return res.redirect(`/questions/edit/${req.body.questionId}`);
    }
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

app.post(
  "/election/launch/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    console.log(req.body);
    const election = await Election.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Question,
          include: [Answer],
        },
      ],
    });
    if (election.Questions.length == 0) {
      req.flash("error", "Election must have at least one question");
      return res.redirect(`/election/launch/${req.params.id}`);
    }
    for (let i = 0; i < election.Questions.length; i++) {
      if (election.Questions[i].Answers.length < 2) {
        req.flash("error", "Each question must have at least two answers");
        return res.redirect(`/election/launch/${req.params.id}`);
      }
    }
    let url = req.body.customURL;
    if (url == "") {
      url = election.id;
    }
    try {
      await Election.update(
        {
          state: "running",
          customURL: url,
        },
        {
          where: { id: req.params.id },
        }
      );
      return res.redirect(`/elections`);
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
);

app.post("/voters", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  console.log(req.body);
  if (req.body.voterID == "") {
    req.flash("error", "VoterID is required");
    return res.redirect(`/voters/add/${req.body.electionId}`);
  }
  if (req.body.password.length < 6) {
    req.flash("error", "Password must be at least 6 characters");
    return res.redirect(`/voters/add/${req.body.electionId}`);
  }
  const voter = await Voter.findOne({
    where: { voterID: req.body.voterID },
  });
  if (voter) {
    req.flash("error", "VoterID already exists");
    return res.redirect(`/voters/add/${req.body.electionId}`);
  }
  try {
    await Voter.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      password: req.body.password,
      voterID: req.body.voterID,
      electionId: req.body.electionId,
    });
    return res.redirect(`/elections/${req.body.electionId}`);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

app.post("/e/:customURL/start", async (req, res) => {
  console.log(req.body);
  try {
    const result = await verifyVoter(
      req.body.voterID,
      req.body.password,
      req.body.electionURL
    );
    if (result) {
      const election = await Election.findOne({
        where: { customURL: req.body.electionURL },
        include: [
          {
            model: Question,
            include: [Answer],
          },
        ],
        order: [[Question, Answer, "id", "ASC"]],
      });
      const voter = await Voter.findOne({
        where: { voterID: req.body.voterID },
      });
      if (!voter.voted) {
        return res.render("myElection", {
          election,
          voter,
          csrfToken: req.csrfToken(),
        });
      } else {
        return res.render("voted", { csrfToken: req.csrfToken() });
      }
    } else {
      req.flash("error", "Invalid VoterID or Password");
      return res.redirect(`/e/${req.body.electionURL}`);
    }
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

app.post("/elections/:id/answers", async (req, res) => {
  console.log(req.body);
  try {
    let election = await Election.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Question,
          include: [Answer],
        },
      ],
      order: [[Question, Answer, "id", "ASC"]],
    });
    const questions = election.Questions;
    for (let i = 0; i < questions.length; i++) {
      const id = `q${i}`;
      await Answer.update(
        {
          votes: Sequelize.literal("votes + 1"),
        },
        {
          where: { id: req.body[id] },
        }
      );
    }
    await Voter.update(
      {
        voted: true,
      },
      {
        where: { id: req.body.voterId },
      }
    );

    election = await Election.findOne({
      where: { id: req.params.id },
      include: [
        {
          model: Question,
          include: [Answer],
        },
      ],
      order: [[Question, Answer, "id", "ASC"]],
    });
    if (election.state == "running") {
      return res.render("voted", { csrfToken: req.csrfToken() });
    }
    // return res.render("results", { election, csrfToken: req.csrfToken() });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

app.post("/newpass", connectEnsureLogin.ensureLoggedIn(), async (req, res) => {
  console.log(req.body);
  if (req.body.newPass.length < 6) {
    req.flash("error", "Password must be at least 6 characters");
    return res.redirect(`/newpass`);
  }
  if (req.body.newPass != req.body.cnfPass) {
    req.flash("error", "Passwords do not match");
    return res.redirect(`/newpass`);
  }
  const admin = await Admin.findOne({
    where: { id: req.user.id },
  });
  const result = await bcrypt.compare(req.body.currPass, admin.password);
  if (!result) {
    req.flash("error", "Incorrect Password");
    return res.redirect(`/newpass`);
  }
  const hashedPassword = await bcrypt.hash(req.body.newPass, saltRounds);
  try {
    await Admin.update(
      {
        password: hashedPassword,
      },
      {
        where: { id: req.user.id },
      }
    );
    return res.redirect(`/logout`);
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

//==================================================
// put requests

app.put(
  "/election/stop/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    try {
      await Election.update(
        {
          state: "closed",
        },
        {
          where: { id: req.params.id },
        }
      );
      return res.json({ success: true });
    } catch (error) {
      console.log(error);
      return res.sendStatus(500);
    }
  }
);

//==================================================
// delete requests

app.delete(
  "/elections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (req, res) => {
    const election = await Election.findOne({
      where: { id: req.params.id },
    });
    if (election.state == "running") {
      return res.json({
        success: false,
        message: "Unable to delete a running election",
      });
    }
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
    const question = await Question.findOne({
      where: { id: req.params.id },
    });
    const election = await Election.findOne({
      where: { id: question.electionId },
      include: [Question],
    });
    if (election.Questions.length <= 1) {
      return res.json({
        success: false,
        message: "Election must have 1 question",
      });
    }
    if (election.state == "running") {
      return res.json({
        success: false,
        message: "Unable to delete in a running election",
      });
    }
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
    const answer = await Answer.findOne({
      where: { id: req.params.id },
    });
    const question = await Question.findOne({
      where: { id: answer.questionId },
    });
    const election = await Election.findOne({
      where: { id: question.electionId },
    });
    if (election.state == "running") {
      return res.json({
        success: false,
        message: "Unable to delete in a running election",
      });
    }
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
