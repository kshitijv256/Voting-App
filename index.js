// express app
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// import the routes
// const routes = require('./routes');

// use the routes
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('My Voting App')
    });

// start the server
app.listen(port, () => {
    console.log(`Voting app listening at http://localhost:${port}`)
    });