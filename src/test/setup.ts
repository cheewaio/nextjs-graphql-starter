import "@testing-library/jest-dom/vitest";

process.env.JWT_SECRET ??= "test-secret";
process.env.DATABASE_URL ??= "file:./dev.db";
