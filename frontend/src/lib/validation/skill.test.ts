import { describe, expect, it } from "vitest";

import { INSTALL_COMMAND_RE, skillSubmitSchema } from "./skill";

const valid = {
  name: "Schema Drift Watcher",
  summary: "Compares migrations with application models.",
  category_id: "c-1",
  install_command: "codex skill install mina/schema-drift-watcher",
  source_url: "github.com/mina/schema-drift-watcher",
};

describe("skillSubmitSchema (mirrors schema.md constraints)", () => {
  it("accepts a valid submission", () => {
    expect(skillSubmitSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a too-short name", () => {
    expect(skillSubmitSchema.safeParse({ ...valid, name: "ab" }).success).toBe(false);
  });

  it("rejects a too-short summary", () => {
    expect(skillSubmitSchema.safeParse({ ...valid, summary: "short" }).success).toBe(false);
  });

  it("requires a category", () => {
    expect(skillSubmitSchema.safeParse({ ...valid, category_id: "" }).success).toBe(false);
  });

  it("rejects an install command in the wrong format", () => {
    expect(skillSubmitSchema.safeParse({ ...valid, install_command: "pip install evil" }).success).toBe(false);
  });
});

describe("INSTALL_COMMAND_RE (schema.md install_command)", () => {
  it("matches each approved agent + verb", () => {
    expect(INSTALL_COMMAND_RE.test("codex skill install owner/name")).toBe(true);
    expect(INSTALL_COMMAND_RE.test("claude skill add owner/name")).toBe(true);
    expect(INSTALL_COMMAND_RE.test("gemini skill install a/b")).toBe(true);
    expect(INSTALL_COMMAND_RE.test("opencode skill add a.b_c/d-e")).toBe(true);
  });

  it("rejects unknown agents or verbs", () => {
    expect(INSTALL_COMMAND_RE.test("npm install x")).toBe(false);
    expect(INSTALL_COMMAND_RE.test("codex run install x/y")).toBe(false);
  });
});
