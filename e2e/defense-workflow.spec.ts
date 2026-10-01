import { test, expect } from "@playwright/test";
import { loginAs, switchAccount, DEMO_ACCOUNTS } from "./helpers";

test.describe.serial("defense workflow", () => {
  test("participant explores profile and catalog, submits an application", async ({ page }) => {
    await loginAs(page, DEMO_ACCOUNTS.participant.name);
    await expect(page.getByRole("heading", { name: /Здравствуйте, Мария/ })).toBeVisible();

    await page.getByRole("link", { name: "Профиль" }).click();
    await expect(page.getByRole("heading", { name: "Профиль" })).toBeVisible();
    await expect(page.getByText("Журналистика", { exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Проекты" }).click();
    await expect(page.getByRole("heading", { name: "Каталог проектов" })).toBeVisible();
    await page.getByRole("link", { name: "Экологический квест" }).click();
    await expect(page.getByRole("heading", { name: "Экологический квест" })).toBeVisible();

    await page
      .getByLabel("Сопроводительное сообщение (необязательно)")
      .fill("Хочу помочь с текстами и фотографиями для квеста.");
    await page.getByRole("button", { name: "Подать заявку" }).click();
    await expect(page.getByText("На рассмотрении")).toBeVisible();
  });

  test("organizer reviews the queue and approves the application", async ({ page }) => {
    await loginAs(page, DEMO_ACCOUNTS.organizer.name);

    await page.getByRole("link", { name: "Заявки" }).click();
    await expect(page.getByRole("heading", { name: "Заявки на проекты" })).toBeVisible();

    const applicationCard = page
      .locator("li")
      .filter({ hasText: "Мария Соколова" })
      .filter({ hasText: "Экологический квест" });
    await expect(applicationCard).toBeVisible();
    await applicationCard.getByRole("button", { name: "Одобрить" }).click();
    await expect(applicationCard).toHaveCount(0);

    await page.getByRole("link", { name: "Одобренные" }).click();
    await expect(
      page.locator("li").filter({ hasText: "Мария Соколова" }).filter({ hasText: "Экологический квест" })
    ).toBeVisible();
  });

  test("organizer opens the resulting team workspace and assigns a task", async ({ page }) => {
    await loginAs(page, DEMO_ACCOUNTS.organizer.name);

    await page.goto("/projects/proj-eco-quest");
    await page.getByRole("link", { name: "Команда проекта" }).click();
    await expect(page.getByRole("heading", { name: /Команда/ })).toBeVisible();
    await expect(page.getByRole("listitem").getByText("Мария Соколова")).toBeVisible();

    await page.getByLabel("Название задачи").fill("Подготовить маршрут квеста");
    await page.getByLabel("Исполнитель").selectOption({ label: "Мария Соколова" });
    await page.getByRole("button", { name: "Создать задачу" }).click();

    await expect(page.getByText("Подготовить маршрут квеста")).toBeVisible();
  });

  test("participant sees the updated dashboard and organizer analytics reflect the change", async ({ page }) => {
    await loginAs(page, DEMO_ACCOUNTS.participant.name);

    await expect(page.getByText("Экологический квест").first()).toBeVisible();
    await expect(page.getByText("Подготовить маршрут квеста")).toBeVisible();

    await switchAccount(page);
    await loginAs(page, DEMO_ACCOUNTS.organizer.name);
    await page.getByRole("link", { name: "Аналитика" }).click();
    await expect(page.getByRole("heading", { name: "Аналитика" })).toBeVisible();
    await expect(page.getByText("Проекты по статусу")).toBeVisible();
  });
});
