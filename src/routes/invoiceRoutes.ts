import express from "express";
import {
  createInvoice,
  getInvoiceById,
  getInvoices,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} from "../services/invoiceService.js";

const router = express.Router();

router.post("/invoices", async (req, res, next) => {
  try {
    const { customerId, dueDate, items } = req.body;

    const invoice = await createInvoice({ customerId, dueDate, items });

    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

router.get("/invoices/:id", async (req, res, next) => {
  try {
    const invoice = await getInvoiceById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Invoice not found",
      });
    }

    res.status(200).json(invoice);
  } catch (error) {
    next(error);
  }
});

router.get("/invoices", async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid pagination parameters",
      });
    }

    const status =
      typeof req.query.status === "string" ? req.query.status : undefined;

    const customerId =
      typeof req.query.customerId === "string"
        ? req.query.customerId
        : undefined;

    const from =
      typeof req.query.from === "string" ? req.query.from : undefined;

    const to = typeof req.query.to === "string" ? req.query.to : undefined;

    const { invoices, total } = await getInvoices(
      page,
      limit,
      status as "DRAFT" | "ISSUED" | "PAID" | "CANCELLED" | undefined,
      customerId,
      from,
      to,
    );

    res.status(200).json({
      data: invoices,
      page,
      limit,
      total,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/invoices/:id", async (req, res, next) => {
  try {
    const { dueDate, items } = req.body;

    if (dueDate === undefined && items === undefined) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Provide dueDate or items",
      });
    }

    const invoice = await updateInvoice(req.params.id, {
      dueDate,
      items,
    });

    if (!invoice) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Invoice not found",
      });
    }

    res.status(200).json(invoice);
  } catch (error) {
    next(error);
  }
});

router.post("/invoices/:id/issue", async (req, res, next) => {
  try {
    const invoice = await updateInvoiceStatus(req.params.id, "issue");

    if (!invoice) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Invoice not found",
      });
    }

    res.status(200).json(invoice);
  } catch (error) {
    next(error);
  }
});

router.post("/invoices/:id/pay", async (req, res, next) => {
  try {
    const invoice = await updateInvoiceStatus(req.params.id, "pay");

    if (!invoice) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Invoice not found",
      });
    }

    res.status(200).json(invoice);
  } catch (error) {
    next(error);
  }
});

router.post("/invoices/:id/cancel", async (req, res, next) => {
  try {
    const invoice = await updateInvoiceStatus(req.params.id, "cancel");

    if (!invoice) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Invoice not found",
      });
    }

    res.status(200).json(invoice);
  } catch (error) {
    next(error);
  }
});

router.delete("/invoices/:id", async (req, res, next) => {
  try {
    const invoice = await deleteInvoice(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Invoice not found",
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
