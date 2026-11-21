import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const item = { policy_version_id: "v1", policy_key: "p1", title: "Synthetic policy", version_label: "1", effective_from: "2026-01-01", effective_to: null, approval_status: "DRAFT", ingestion_status: "READY", classification: "INTERNAL", allowed_roles: ["analyst"], active_chunks: 1, owner_label: "Synthetic owner", status_reason: null };

function loadPage(items) {
  const mocks = {
    "@/app/actions": { policyLifecycle: async () => {}, syncPolicies: async () => {} },
    "@/components/SubmitButton": { SubmitButton: ({ children }) => React.createElement("button", null, children) },
    "@/components/ui": { Empty: ({ children }) => React.createElement("p", null, children), ErrorState: () => null, Flash: () => null },
    "@/lib/api": { load: async () => ({ data: { items }, error: null }) },
    "@/lib/session": { requireSession: async () => {} },
  };
  const source = readFileSync(new URL("../app/policies/admin/page.tsx", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  const exports = {};
  new Function("require", "exports", "module", code)((id) => id in mocks ? mocks[id] : require(id), exports, { exports });
  return exports.default;
}

test("policy versions have a named, keyboard-focusable table region", async () => {
  const html = renderToStaticMarkup(await loadPage([item])({ searchParams: Promise.resolve({}) }));
  assert.match(html, /role="region" aria-label="Policy versions table" tabindex="0"/);
  assert.match(html, /<caption>Policy versions<\/caption>/);
  assert.match(html, /Synthetic policy/);
});

test("an empty policy list does not render a table", async () => {
  const html = renderToStaticMarkup(await loadPage([])({ searchParams: Promise.resolve({}) }));
  assert.match(html, /No policy versions/);
  assert.doesNotMatch(html, /<table/);
});
