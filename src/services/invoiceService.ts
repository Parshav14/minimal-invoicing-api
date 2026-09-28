import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../db.js";

type InvoiceItemInput = {
  description: string;
  quantity: number;
  unitPriceCents: number;
};

type CreateInvoiceInput = {
  customerId: string;
  dueDate: string;
  items: InvoiceItemInput[];
};

export const createInvoice = async (input: CreateInvoiceInput) => {
  const { customerId, dueDate, items } = input;

  if (items.length < 1) {
    throw new Error("Invoice must contain at least one item");
  }

  for (const item of items) {
    if (item.quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    if (item.unitPriceCents < 0) {
      throw new Error("Unit price cannot be negative");
    }
  }

  const totalCents = items.reduce(
    (total, item) => total + item.quantity * item.unitPriceCents,
    0,
  );

  const parsedDueDate = new Date(dueDate);

  if (Number.isNaN(parsedDueDate.getTime())) {
    throw new Error("Invalid dueDate");
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const year = new Date().getFullYear();
          const prefix = `INV-${year}-`;

          const lastInvoice = await tx.invoice.findFirst({
            where: {
              number: {
                startsWith: prefix,
              },
            },
            orderBy: {
              number: "desc",
            },
            select: {
              number: true,
            },
          });

          const nextNumber = lastInvoice
            ? Number(lastInvoice.number.slice(-4)) + 1
            : 1;

          const number = `${prefix}${String(nextNumber).padStart(4, "0")}`;

          return tx.invoice.create({
            data: {
              customerId,
              number,
              status: "DRAFT",
              dueDate: parsedDueDate,
              totalCents,
              invoiceitem: {
                create: items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPriceCents: item.unitPriceCents,
                })),
              },
            },
            include: {
              invoiceitem: true,
              customer: true,
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Invoice creation failed");
};
