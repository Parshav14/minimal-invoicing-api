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

test("patch draft invoice and lock issued invoice", async () => {
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

  const update = await request(app)
    .patch(`/invoices/${create.body.id}`)
    .send({
      dueDate: "2026-11-01",
      items: [
        {
          description: "Monitor",
          quantity: 2,
          unitPriceCents: 30000,
        },
      ],
    });

  assert.equal(update.status, 200);
  assert.equal(update.body.totalCents, 60000);
  assert.equal(update.body.invoiceitem.length, 1);

  await request(app).post(`/invoices/${create.body.id}/issue`);

  const locked = await request(app).patch(`/invoices/${create.body.id}`).send({
    dueDate: "2026-12-01",
  });

  assert.equal(locked.status, 409);
  assert.equal(locked.body.error, "INVOICE_LOCKED");
});

test("invoice lifecycle works", async () => {
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

  const issue = await request(app).post(`/invoices/${create.body.id}/issue`);

  assert.equal(issue.status, 200);
  assert.equal(issue.body.status, "ISSUED");
  assert.ok(issue.body.issueDate);

  const pay = await request(app).post(`/invoices/${create.body.id}/pay`);

  assert.equal(pay.status, 200);
  assert.equal(pay.body.status, "PAID");

  const cancelCreate = await request(app)
    .post("/invoices")
    .send({
      customerId,
      dueDate: "2026-10-20",
      items: [
        {
          description: "Mouse",
          quantity: 1,
          unitPriceCents: 2000,
        },
      ],
    });

  const cancel = await request(app).post(
    `/invoices/${cancelCreate.body.id}/cancel`,
  );

  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.status, "CANCELLED");

  const invalidCreate = await request(app)
    .post("/invoices")
    .send({
      customerId,
      dueDate: "2026-10-20",
      items: [
        {
          description: "Keyboard",
          quantity: 1,
          unitPriceCents: 3000,
        },
      ],
    });

  const invalid = await request(app).post(
    `/invoices/${invalidCreate.body.id}/pay`,
  );

  assert.equal(invalid.status, 409);
  assert.equal(invalid.body.error, "INVALID_TRANSITION");
});

test("invoice validation rejects empty items", async () => {
  const response = await request(app).post("/invoices").send({
    customerId,
    dueDate: "2026-10-20",
    items: [],
  });

  assert.equal(response.status, 400);
  assert.equal(response.body.error, "VALIDATION_ERROR");
  assert.ok(Array.isArray(response.body.details));
});

test("delete draft invoice and lock issued invoice", async () => {
  const draft = await request(app)
    .post("/invoices")
    .send({
      customerId,
      dueDate: "2026-10-20",
      items: [
        {
          description: "Mouse",
          quantity: 1,
          unitPriceCents: 2000,
        },
      ],
    });

  assert.equal(draft.status, 201);
  assert.ok(draft.body.id);

  const exists = await prisma.invoice.findUnique({
    where: { id: draft.body.id },
  });

  assert.ok(exists);

  const deleted = await request(app).delete(`/invoices/${draft.body.id}`);

  assert.equal(deleted.status, 204);

  const issued = await request(app)
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

  await request(app).post(`/invoices/${issued.body.id}/issue`);

  const locked = await request(app).delete(`/invoices/${issued.body.id}`);

  assert.equal(locked.status, 409);
  assert.equal(locked.body.error, "INVOICE_LOCKED");
});

test("failed invoice creation leaves no invoice row", async () => {
  const before = await prisma.invoice.count();

  const response = await request(app)
    .post("/invoices")
    .send({
      customerId: "11111111-1111-4111-8111-111111111111",
      dueDate: "2026-10-20",
      items: [
        {
          description: "Laptop",
          quantity: 1,
          unitPriceCents: 50000,
        },
      ],
    });

  assert.equal(response.status, 404);

  const after = await prisma.invoice.count();

  assert.equal(after, before);
});
