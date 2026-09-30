import http from "http";

import app from "./app.js";

const server = http.createServer(app);
const port = Number(process.env.PORT) || 3000;

server.listen(port);
