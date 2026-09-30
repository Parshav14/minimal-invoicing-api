import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import app from "../src/app.js";

test("create and get customer", async () => {
  const email = `customer-${Date.now()}@example.com`;

  const create = await request(app).post("/customers").send({
    name: "Test Customer",
    email,
  });

  assert.equal(create.status, 201);

  const get = await request(app).get(`/customers/${create.body.id}`);

  assert.equal(get.status, 200);
  assert.equal(get.body.id, create.body.id);
  assert.equal(get.body.email, email);
});

test("customer list is paginated", async () => {
  await request(app)
    .post("/customers")
    .send({
      name: "Customer One",
      email: `one-${Date.now()}@example.com`,
    });

  await request(app)
    .post("/customers")
    .send({
      name: "Customer Two",
      email: `two-${Date.now()}@example.com`,
    });

  const response = await request(app).get("/customers?page=1&limit=1");

  assert.equal(response.status, 200);
  assert.equal(response.body.page, 1);
  assert.equal(response.body.limit, 1);
  assert.equal(response.body.data.length, 1);
  assert.ok(response.body.total >= 2);
});

test("update customer and handle unknown id", async () => {
  const create = await request(app)
    .post("/customers")
    .send({
      name: "Old Name",
      email: `update-${Date.now()}@example.com`,
    });

  const update = await request(app).patch(`/customers/${create.body.id}`).send({
    name: "New Name",
  });

  assert.equal(update.status, 200);
  assert.equal(update.body.name, "New Name");

  const unknown = await request(app)
    .patch("/customers/11111111-1111-4111-8111-111111111111")
    .send({
      name: "Test",
    });

  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error, "NOT_FOUND");
});

test("duplicate customer email returns 409", async () => {
  const email = `duplicate-${Date.now()}@example.com`;

  await request(app).post("/customers").send({
    name: "First Customer",
    email,
  });

  const response = await request(app).post("/customers").send({
    name: "Second Customer",
    email,
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.error, "EMAIL_TAKEN");
});
