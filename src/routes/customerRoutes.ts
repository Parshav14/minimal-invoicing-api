import express from "express";
import { z } from "zod";
import {
  createCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer,
} from "../services/customerService.js";

const router = express.Router();

const customerIdSchema = z.object({
  id: z.uuid(),
});

const customerCreateSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
});

const customerUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.email().optional(),
  })
  .refine((data) => data.name !== undefined || data.email !== undefined);

const customerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.post("/customers", async (req, res, next) => {
  try {
    const body = customerCreateSchema.parse(req.body);
    const customer = await createCustomer(body.name, body.email);
    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

router.get("/customers/:id", async (req, res, next) => {
  try {
    const { id } = customerIdSchema.parse(req.params);
    const customer = await getCustomerById(id);

    if (!customer) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Customer not found",
      });
    }

    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
});

router.get("/customers", async (req, res, next) => {
  try {
    const { page, limit } = customerQuerySchema.parse(req.query);

    const { customers, total } = await getCustomers(page, limit);

    res.status(200).json({
      data: customers,
      page,
      limit,
      total,
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/customers/:id", async (req, res, next) => {
  try {
    const { id } = customerIdSchema.parse(req.params);
    const body = customerUpdateSchema.parse(req.body);

    const customer = await updateCustomer(id, body.name, body.email);

    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
});

export default router;
