import test from "node:test";
import assert from "node:assert/strict";
import { createDepartmentSchema, updateDepartmentSchema } from "./validators";

test("createDepartmentSchema accepts a valid department payload", () => {
  const payload = {
    name: "Cardiology",
    description: "Handles cardiac care",
    isActive: true,
  };

  const result = createDepartmentSchema.safeParse(payload);

  assert.equal(result.success, true);
});

test("createDepartmentSchema rejects an empty department name", () => {
  const result = createDepartmentSchema.safeParse({
    name: "",
    description: "Missing name",
  });

  assert.equal(result.success, false);
});

test("updateDepartmentSchema allows partial updates", () => {
  const result = updateDepartmentSchema.safeParse({ name: "Neurology" });

  assert.equal(result.success, true);
});
