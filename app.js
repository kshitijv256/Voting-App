const express = require('express');
const { Election, Question, Answer } = require('./models');
const path = require("path");
const bodyParser = require("body-parser");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// app.use(express.static(path.join(__dirname, 'public')));


app.get('/', (req, res) => {
    res.render('index');
    });


app.post('/elections', (req, res) => {
    console.log(req.body);
    try {
        Election.create({
            title: req.body.title,
            description: req.body.description,
        });
        res.send('Election created');
    } catch (error) {
        console.log(error);
        res.send('Error creating election');
    }
    });

module.exports = app;