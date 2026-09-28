import express from "express";
import { createInvoice } from "../services/invoiceService.js";

const router = express.Router();

router.post("/invoices", async (req, res) => {
  const { customerId, dueDate, items } = req.body;

    const invoice = await createInvoice({ customerId, dueDate, items });

  res.status(201).json(invoice);
});

export default router;
