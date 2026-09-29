import express from "express";
import { z } from "zod";
import {
  createInvoice,
  getInvoiceById,
  getInvoices,
  updateInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} from "../services/invoiceService.js";

const router = express.Router();

const invoiceIdSchema = z.object({
  id: z.uuid(),
});

const dateSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "Invalid date");

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().min(1),
  unitPriceCents: z.number().int().min(0),
});

const invoiceCreateSchema = z.object({
  customerId: z.uuid(),
  dueDate: dateSchema,
  items: z.array(invoiceItemSchema).min(1),
});

const invoiceUpdateSchema = z
  .object({
    dueDate: dateSchema.optional(),
    items: z.array(invoiceItemSchema).min(1).optional(),
  })
  .refine((data) => data.dueDate !== undefined || data.items !== undefined);

const invoiceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).optional(),
  customerId: z.uuid().optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

router.post("/invoices", async (req, res, next) => {
  try {
    const body = invoiceCreateSchema.parse(req.body);
    const invoice = await createInvoice(body);

    res.status(201).json(invoice);
  } catch (error) {
    next(error);
  }
});

router.get("/invoices/:id", async (req, res, next) => {
  try {
    const { id } = invoiceIdSchema.parse(req.params);
    const invoice = await getInvoiceById(id);

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
    const { page, limit, status, customerId, from, to } =
      invoiceQuerySchema.parse(req.query);

    const { invoices, total } = await getInvoices(
      page,
      limit,
      status,
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
    const { id } = invoiceIdSchema.parse(req.params);
    const body = invoiceUpdateSchema.parse(req.body);

    const input = {
      ...(body.dueDate !== undefined && { dueDate: body.dueDate }),
      ...(body.items !== undefined && { items: body.items }),
    };

    const invoice = await updateInvoice(id, input);

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
    const { id } = invoiceIdSchema.parse(req.params);
    const invoice = await updateInvoiceStatus(id, "issue");

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
    const { id } = invoiceIdSchema.parse(req.params);
    const invoice = await updateInvoiceStatus(id, "pay");

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
    const { id } = invoiceIdSchema.parse(req.params);
    const invoice = await updateInvoiceStatus(id, "cancel");

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
    const { id } = invoiceIdSchema.parse(req.params);
    const invoice = await deleteInvoice(id);

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
