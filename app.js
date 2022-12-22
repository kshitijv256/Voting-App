const express = require('express');
const path = require("path");

const app = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, 'public')));



app.get('/', (req, res) => {
    res.send('My Voting App')
    });

module.exports = app;