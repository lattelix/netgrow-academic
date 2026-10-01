import type { Page } from "@playwright/test";

export const DEMO_ACCOUNTS = {
  participant: { name: "Мария Соколова" },
  organizer: { name: "Ирина Ковалёва" },
  admin: { name: "Виктор Наумов" },
};

export async function loginAs(page: Page, fullName: string) {
  await page.goto("/login");
  await page
    .getByRole("button", { name: new RegExp(fullName) })
    .click();
  await page.waitForURL("**/dashboard");
}

export async function switchAccount(page: Page) {
  await page.getByRole("button", { name: "Сменить аккаунт" }).click();
  await page.waitForURL("**/login");
}
