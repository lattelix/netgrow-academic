import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { loadLocalEnv } from "./src/lib/db/env";

loadLocalEnv();

afterEach(() => {
  cleanup();
});
