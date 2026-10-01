import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers";

test("participant cannot access administration", async ({ page }) => {
  await loginAs(page, "Мария Соколова");
  await page.goto("/admin");
  await expect(page.getByText("Доступ запрещён")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Администрирование" })).toHaveCount(0);
});

test("participant cannot access the organizer application queue", async ({ page }) => {
  await loginAs(page, "Мария Соколова");
  await page.goto("/organizer/applications");
  await expect(page.getByText("Доступ запрещён")).toBeVisible();
});

test("an organizer cannot edit a project owned by another organizer", async ({ page }) => {
  await loginAs(page, "Дмитрий Орлов");
  await page.goto("/projects/proj-eco-quest/edit");
  await expect(page.getByText("Доступ запрещён")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Редактирование проекта" })).toHaveCount(0);
});

test("an organizer cannot list applications for another organizer's project", async ({ page }) => {
  await loginAs(page, "Ирина Ковалёва");
  const response = await page.request.get(
    "/api/applications?projectId=proj-opening-concert",
  );

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual([]);
});

test("a participant cannot read another team's workspace through the API", async ({ page }) => {
  await loginAs(page, "Мария Соколова");

  const byId = await page.request.get("/api/teams/team-media-center");
  const byProject = await page.request.get(
    "/api/teams/by-project/proj-media-center",
  );

  expect(byId.status()).toBe(403);
  expect(byProject.status()).toBe(403);
});

test("the API rejects a participant attempting to approve an application", async ({ page }) => {
  await loginAs(page, "Мария Соколова");
  const response = await page.request.patch("/api/applications/app-eco-quest-volkov", {
    data: { status: "approved" },
  });
  expect(response.status()).toBe(403);
});
