import bcrypt from "bcrypt";

import AuthUser from "../src/modules/auth/auth.model";
import Organization from "../src/modules/organization/organization.model";

export const TEST_ADMIN_EMAIL = "aliya.admin@example.com";
export const TEST_ADMIN_PASSWORD = "Admin@123";
export const TEST_EMPLOYEE_EMAIL = "employee.test@example.com";
export const TEST_EMPLOYEE_PASSWORD = "Employee@123";

const TEST_ORGANIZATION_SLUG = "jest-test-organization";

export const createTestUser = async ({
  name,
  email,
  password,
  role,
  organizationId,
}: {
  name: string;
  email: string;
  password: string;
  role: "admin" | "employee";
  organizationId: string;
}) => {
  return AuthUser.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    role,
    organizationId,
    isActive: true,
    isEmailVerified: true,
  });
};

export const ensureTestFixtures = async (): Promise<void> => {
  const organization = await Organization.findOneAndUpdate(
    { slug: TEST_ORGANIZATION_SLUG },
    {
      $setOnInsert: {
        name: "Jest Test Organization",
        slug: TEST_ORGANIZATION_SLUG,
        isActive: true,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  if (!organization) {
    throw new Error("Failed to initialize Jest test organization");
  }

  const adminPassword = await bcrypt.hash(
    TEST_ADMIN_PASSWORD,
    10
  );
  const employeePassword = await bcrypt.hash(
    TEST_EMPLOYEE_PASSWORD,
    10
  );

  await AuthUser.findOneAndUpdate(
    { email: TEST_ADMIN_EMAIL },
    {
      $set: {
        name: "Jest Test Admin",
        password: adminPassword,
        role: "admin",
        organizationId: organization._id,
        isActive: true,
        isEmailVerified: true,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  await AuthUser.findOneAndUpdate(
    { email: TEST_EMPLOYEE_EMAIL },
    {
      $set: {
        name: "Jest Test Employee",
        password: employeePassword,
        role: "employee",
        organizationId: organization._id,
        isActive: true,
        isEmailVerified: true,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
};
