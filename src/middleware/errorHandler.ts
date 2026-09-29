import type { Request, Response, NextFunction } from "express";
import { Prisma } from "../generated/prisma/client.js";
import { z } from "zod";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  void _next;

  const err = error as {
    message?: string;
  };

  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Invalid input data fields",
      details: error.issues,
    });
  }

  if (err.message === "INVOICE_LOCKED") {
    return res.status(409).json({
      error: "INVOICE_LOCKED",
      message: "Invoice is locked",
    });
  }

  if (err.message === "INVALID_TRANSITION") {
    return res.status(409).json({
      error: "INVALID_TRANSITION",
      message: "Invalid invoice status transition",
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return res.status(409).json({
        error: "EMAIL_TAKEN",
        message: "Email is already in use",
      });
    }

    if (error.code === "P2025" || error.code === "P2003") {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Resource not found",
      });
    }
  }

  return res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Something went wrong",
  });
};
