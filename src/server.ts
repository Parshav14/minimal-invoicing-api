import http from "http";

import express from "express";

import { prisma } from "./db.js";

const app = express();

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "degraded" });
  }
});

app.get("/customer", (req, res) => {
  res.status(201).send("Hello, Customer!");
});

app.use("/", (req, res) => {
  res.send("Hello, Welcome to the server!");
});

const server = http.createServer(app);

server.listen(3000);
