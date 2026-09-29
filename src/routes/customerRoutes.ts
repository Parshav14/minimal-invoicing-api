import express from "express";
import {
  createCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer,
} from "../services/customerService.js";

const router = express.Router();

router.post("/customers", async (req, res, next) => {
  try {
    const { name, email } = req.body;
    const customer = await createCustomer(name, email);
    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

router.get("/customers/:id", async (req, res, next) => {
  try {
    const customer = await getCustomerById(req.params.id);

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
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (limit > 100 || limit < 1) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "limit must be between 1 and 100",
        details: [],
      });
    }

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
    const { name, email } = req.body;

    const customer = await updateCustomer(req.params.id, name, email);

    res.status(200).json(customer);
  } catch (error) {
    next(error);
  }
});

export default router;
