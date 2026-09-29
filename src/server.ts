import http from "http";

import express from "express";

import { prisma } from "./db.js";
import customerRoutes from "./routes/customerRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(express.json());
app.use(customerRoutes);
app.use(invoiceRoutes);

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "degraded" });
  }
});

app.use("/", (req, res) => {
  res.send("Hello, Welcome to the Minimal Envoicing API server!");
});

app.use(errorHandler);

const server = http.createServer(app);
server.listen(3000);
