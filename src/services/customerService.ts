import { prisma } from "../db.js";

export const createCustomer = async (name: string, email: string) => {
  return prisma.customer.create({
    data: {
      name,
      email,
    },
  });
};

export const getCustomerById = async (id: string) => {
  return prisma.customer.findUnique({
    where: { id },
  });
};

export const getCustomers = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const customers = await prisma.customer.findMany({
    skip,
    take: limit,
  });

  const total = await prisma.customer.count();

  return { customers, total };
};

export const updateCustomer = async (
  id: string,
  name?: string,
  email?: string,
) => {
  return prisma.customer.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
    },
  });
};
