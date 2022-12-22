const app = require('./app');

const port = process.env.PORT || 3000;

// start the server
app.listen(port, () => {
    console.log(`Voting app server listening at http://localhost:${port}`)
    });