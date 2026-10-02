import { test, expect } from "@playwright/test";
import { loginAs, switchAccount, DEMO_ACCOUNTS } from "./helpers";

test.describe.serial("defense workflow", () => {
  let taskCountsAfterAssignment: Record<string, number> = {};
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

    const analyticsResponse = await page.request.get("/api/analytics");
    expect(analyticsResponse.status()).toBe(200);
    const analytics = (await analyticsResponse.json()) as {
      tasksByStatus: { status: string; count: number }[];
    };
    taskCountsAfterAssignment = Object.fromEntries(
      analytics.tasksByStatus.map((item) => [item.status, item.count])
    );
  });

  test("participant changes task status and dashboard plus organizer analytics reflect it", async ({ page }) => {
    await loginAs(page, DEMO_ACCOUNTS.participant.name);

    await expect(page.getByText("Экологический квест").first()).toBeVisible();
    await expect(page.getByText("Подготовить маршрут квеста")).toBeVisible();

    await page.getByRole("link", { name: "Подготовить маршрут квеста" }).click();
    const taskRow = page.getByRole("row").filter({ hasText: "Подготовить маршрут квеста" });
    const status = taskRow.getByLabel("Статус задачи");
    await status.selectOption("in_progress");
    await expect(status).toHaveValue("in_progress");

    await page.goto("/dashboard");
    const taskItem = page.locator("li").filter({ hasText: "Подготовить маршрут квеста" });
    await expect(taskItem.getByText("В работе", { exact: true })).toBeVisible();

    await switchAccount(page);
    await loginAs(page, DEMO_ACCOUNTS.organizer.name);

    const analyticsResponse = await page.request.get("/api/analytics");
    expect(analyticsResponse.status()).toBe(200);
    const analytics = (await analyticsResponse.json()) as {
      tasksByStatus: { status: string; count: number }[];
    };
    const taskCountsAfterStatusChange = Object.fromEntries(
      analytics.tasksByStatus.map((item) => [item.status, item.count])
    );
    expect(taskCountsAfterStatusChange.todo ?? 0).toBe((taskCountsAfterAssignment.todo ?? 0) - 1);
    expect(taskCountsAfterStatusChange.in_progress ?? 0).toBe(
      (taskCountsAfterAssignment.in_progress ?? 0) + 1
    );

    await page.getByRole("link", { name: "Аналитика" }).click();
    await expect(page.getByRole("heading", { name: "Аналитика" })).toBeVisible();
    await expect(page.getByText("Задачи по статусу")).toBeVisible();
  });
});
