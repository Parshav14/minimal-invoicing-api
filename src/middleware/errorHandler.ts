import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  void _next;
  if (error.message === "INVOICE_LOCKED") {
    return res.status(409).json({
      error: "INVOICE_LOCKED",
      message: "Invoice is locked",
    });
  }

  if (error.message === "INVALID_TRANSITION") {
    return res.status(409).json({
      error: "INVALID_TRANSITION",
      message: "Invalid invoice status transition",
    });
  }

  return res.status(500).json({
    error: "INTERNAL_ERROR",
    message: "Something went wrong",
  });
};
