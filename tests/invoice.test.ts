import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";
import { prisma } from "../src/db.js";

let customerId: string;

beforeEach(async () => {
  const response = await request(app)
    .post("/customers")
    .send({
      name: "Invoice Test Customer",
      email: `invoice-${Date.now()}@example.com`,
    });

  assert.equal(response.status, 201);
  customerId = response.body.id;
});

test("create invoice calculates total", async () => {
  const response = await request(app)
    .post("/invoices")
    .send({
      customerId,
      dueDate: "2026-10-20",
      items: [
        {
          description: "Laptop",
          quantity: 2,
          unitPriceCents: 50000,
        },
        {
          description: "Mouse",
          quantity: 1,
          unitPriceCents: 2000,
        },
      ],
      totalCents: 1,
    });

  assert.equal(response.status, 201);
  assert.equal(response.body.status, "DRAFT");
  assert.equal(response.body.totalCents, 102000);
  assert.match(response.body.number, /^INV-\d{4}-\d{4}$/);
});