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

export const getInvoiceById = async (id: string) => {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      invoiceitem: true,
      customer: true,
    },
  });
};

export const getInvoices = async (
  page: number,
  limit: number,
  status?: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED",
  customerId?: string,
  from?: string,
  to?: string,
) => {
  const skip = (page - 1) * limit;

  const where = {
    ...(status && { status }),
    ...(customerId && { customerId }),
    ...(from || to
      ? {
          issueDate: {
            ...(from && { gte: new Date(`${from}T00:00:00.000Z`) }),
            ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
          },
        }
      : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      include: {
        invoiceitem: true,
        customer: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { invoices, total };
};

type UpdateInvoiceInput = {
  dueDate?: string;
  items?: InvoiceItemInput[];
};

export const updateInvoice = async (id: string, input: UpdateInvoiceInput) => {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({ where: { id } });

    if (!invoice) return null;

    if (invoice.status !== "DRAFT") {
      throw new Error("INVOICE_LOCKED");
    }

    const totalCents = input.items
      ? input.items.reduce(
          (total, item) => total + item.quantity * item.unitPriceCents,
          0,
        )
      : invoice.totalCents;

    return tx.invoice.update({
      where: { id },
      data: {
        ...(input.dueDate && { dueDate: new Date(input.dueDate) }),
        ...(input.items && {
          totalCents,
          invoiceitem: {
            deleteMany: {},
            create: input.items,
          },
        }),
      },
      include: {
        invoiceitem: true,
        customer: true,
      },
    });
  });
};

type InvoiceAction = "issue" | "pay" | "cancel";

export const updateInvoiceStatus = async (
  id: string,
  action: InvoiceAction,
) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
  });

  if (!invoice) return null;

  if (
    (action === "issue" && invoice.status !== "DRAFT") ||
    (action === "pay" && invoice.status !== "ISSUED") ||
    (action === "cancel" &&
      invoice.status !== "DRAFT" &&
      invoice.status !== "ISSUED")
  ) {
    throw new Error("INVALID_TRANSITION");
  }

  const status =
    action === "issue" ? "ISSUED" : action === "pay" ? "PAID" : "CANCELLED";

  return prisma.invoice.update({
    where: { id },
    data: {
      status,
      ...(action === "issue" && { issueDate: new Date() }),
    },
    include: {
      invoiceitem: true,
      customer: true,
    },
  });
};

export const deleteInvoice = async (id: string) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
  });

  if (!invoice) return null;

  if (invoice.status !== "DRAFT") {
    throw new Error("INVOICE_LOCKED");
  }

  await prisma.invoice.delete({
    where: { id },
  });
};
