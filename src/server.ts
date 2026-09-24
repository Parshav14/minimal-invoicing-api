import express = require('express');

import http = require('http');

const app = express();

app.get('/customer', (req, res) => {
    res.status(201).send("Hello, Customer!");
}); 

app.use('/', (req, res) => {
    res.send("Hello, Welcome to the server!");
});

const server = http.createServer(app);

server.listen(3000);