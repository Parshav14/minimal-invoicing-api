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

test("invoice list supports filters and pagination", async () => {
  const create = await request(app)
    .post("/invoices")
    .send({
      customerId,
      dueDate: "2026-10-20",
      items: [
        {
          description: "Laptop",
          quantity: 1,
          unitPriceCents: 50000,
        },
      ],
    });

  await request(app).post(`/invoices/${create.body.id}/issue`);

  const today = new Date().toISOString().slice(0, 10);

  const response = await request(app).get(
    `/invoices?status=ISSUED&customerId=${customerId}&from=${today}&to=${today}&page=1&limit=1`,
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.page, 1);
  assert.equal(response.body.limit, 1);
  assert.equal(response.body.data.length, 1);

  const bad = await request(app).get("/invoices?limit=101");

  assert.equal(bad.status, 400);
  assert.equal(bad.body.error, "VALIDATION_ERROR");
});

test("get invoice returns items and customer", async () => {
  const create = await request(app)
    .post("/invoices")
    .send({
      customerId,
      dueDate: "2026-10-20",
      items: [
        {
          description: "Laptop",
          quantity: 1,
          unitPriceCents: 50000,
        },
      ],
    });

  const response = await request(app).get(`/invoices/${create.body.id}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.invoiceitem.length, 1);
  assert.equal(response.body.customer.id, customerId);
});

