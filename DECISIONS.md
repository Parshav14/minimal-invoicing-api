# Decisions

- Money is stored as integer cents because the specification requires minor units.

- Invoice numbers are generated inside the invoice transaction to avoid duplicate numbers.

- Zod validation is done at the route level before calling services.

- Invoice items use cascade delete because an invoice item belongs to its invoice.

- Tests use a separate PostgreSQL database so test data is separate from the development database.
