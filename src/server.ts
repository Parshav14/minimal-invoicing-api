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

app.use("/", (_req, res) => {
  res.status(404).json({
    error: "NOT_FOUND",
    message: "Resource not found",
  });
});

app.use(errorHandler);

const server = http.createServer(app);
const port = Number(process.env.PORT) || 3000;
server.listen(port);
