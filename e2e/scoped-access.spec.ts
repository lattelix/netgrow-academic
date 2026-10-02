import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test("anonymous read APIs reject requests while demo account selection remains public", async ({ request }) => {
  for (const route of ["/api/projects", "/api/projects/proj-eco-quest", "/api/users", "/api/users/user-sokolova", "/api/analytics", "/api/activity", "/api/events"]) {
    expect((await request.get(route)).status(), route).toBe(401);
  }
  const selector = await request.get("/api/demo-accounts");
  expect(selector.status()).toBe(200);
  const accounts = await selector.json();
  expect(accounts.length).toBeGreaterThan(0);
  expect(accounts.every((account: Record<string, unknown>) => !Object.hasOwn(account, "bio"))).toBe(true);
});

test("participants may read their own profile but not user lists, foreign profiles or analytics", async ({ page }) => {
  await loginAs(page, "Мария Соколова");
  expect((await page.request.get("/api/users/user-sokolova")).status()).toBe(200);
  for (const route of ["/api/users", "/api/users/user-petrov", "/api/analytics", "/api/activity"]) {
    expect((await page.request.get(route)).status(), route).toBe(403);
  }
  expect((await page.request.get("/api/projects/proj-eco-quest")).status()).toBe(200);
});

test("organizer analytics and calendar use the same ownership scope in UI and API", async ({ page }) => {
  await loginAs(page, "Дмитрий Орлов");
  const analyticsResponse = await page.request.get("/api/analytics");
  expect(analyticsResponse.status()).toBe(200);
  const analytics = await analyticsResponse.json();
  expect(analytics.totalProjects).toBe(3);
  expect(analytics.totalTeams).toBe(1);
  expect(analytics.directionBreakdown.some((row: { direction: string }) => row.direction === "Экология")).toBe(false);
  expect((await page.request.get("/api/users/user-sokolova")).status()).toBe(403);
  const activityResponse = await page.request.get("/api/activity?limit=100");
  expect(activityResponse.status()).toBe(200);
  expect(await activityResponse.json()).toEqual([]);

  const calendarResponse = await page.request.get("/api/events?shiftId=shift-vector");
  expect(calendarResponse.status()).toBe(200);
  const calendar = await calendarResponse.json();
  expect(calendar).toHaveLength(3);
  expect(calendar.every((event: { teamId: string | null }) => event.teamId === null)).toBe(true);
  await page.goto("/calendar");
  for (const event of calendar) await expect(page.getByText(event.title, { exact: true })).toBeVisible();
  await expect(page.getByText("Обучение видеомонтажу", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Разметка площадки к фестивалю", { exact: true })).toHaveCount(0);
});

test("administrator retains global analytics, user access and team events", async ({ page }) => {
  await loginAs(page, "Виктор Наумов");
  expect((await page.request.get("/api/users")).status()).toBe(200);
  expect((await page.request.get("/api/users/user-sokolova")).status()).toBe(200);
  const analytics = await (await page.request.get("/api/analytics")).json();
  expect(analytics.totalProjects).toBe(7);
  const events = await (await page.request.get("/api/events?shiftId=shift-vector")).json();
  expect(events).toHaveLength(6);
  await page.goto("/calendar");
  await expect(page.getByText("Обучение видеомонтажу", { exact: true })).toBeVisible();
});
