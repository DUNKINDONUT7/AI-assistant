import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
const credentials = existsSync(".local/owner-credentials.json")
  ? (JSON.parse(readFileSync(".local/owner-credentials.json", "utf8")) as {
      email: string;
      password: string;
    })
  : null;
test("landing page, artwork, FAQ and mobile layout", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Big dreams. Less busywork." }),
  ).toBeVisible();
  await expect(page.locator(".hero-art-frame img")).toHaveJSProperty(
    "complete",
    true,
  );
  await page
    .getByRole("button", { name: "Can I take over a conversation?" })
    .click();
  await expect(
    page.getByText("Yes. Take over from the inbox at any time.", {
      exact: false,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `test-results/landing-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("real owner login, real dashboard, and assistant test", async ({
  page,
}, info) => {
  test.skip(!credentials, "Local live credentials are required.");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#login");
  await page.getByLabel("Email address").fill(credentials!.email);
  await page
    .getByLabel("Password", { exact: true })
    .fill(credentials!.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A good day to connect." }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Demo workspace", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("Bloom & Co.", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `test-results/live-dashboard-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto("/#assistant");
  await expect(
    page.getByRole("heading", { name: "A helping hand. In your voice." }),
  ).toBeVisible();
  await page
    .getByLabel("Test message", { exact: true })
    .fill("What is the name of this business?");
  await page.getByRole("button", { name: "Send test message" }).click();
  await expect(page.locator(".test-message.assistant")).toContainText(
    "My business",
    { timeout: 30000 },
  );
  await page
    .getByLabel("Test message", { exact: true })
    .fill("Can I speak to a human?");
  await page.getByRole("button", { name: "Send test message" }).click();
  await expect(page.locator(".test-message.assistant").last()).toContainText(
    "Customer requested support",
  );
  expect(errors).toEqual([]);
});
