// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertLocalTestDatabaseUrl } from "../resetGuard";

describe("disposable test database guard", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("accepts local test host %s", (host) => {
    expect(() => assertLocalTestDatabaseUrl(`postgresql://${host}/netgrow_test`, "netgrow_test")).not.toThrow();
  });

  it("rejects a local development database", () => {
    expect(() => assertLocalTestDatabaseUrl("postgresql://localhost/netgrow", "netgrow_test")).toThrow();
  });

  it("rejects a remote database even when its name looks like a test database", () => {
    expect(() => assertLocalTestDatabaseUrl("postgresql://database.example/netgrow_test", "netgrow_test")).toThrow();
  });

  it("keeps integration and browser test databases separate", () => {
    expect(() => assertLocalTestDatabaseUrl("postgresql://localhost/netgrow_test", "netgrow_e2e")).toThrow();
  });

  it("rejects a non-PostgreSQL connection", () => {
    expect(() => assertLocalTestDatabaseUrl("https://localhost/netgrow_test", "netgrow_test")).toThrow();
  });
});
