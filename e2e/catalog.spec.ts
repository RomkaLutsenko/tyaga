import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("visitor opens a product card", async ({ page }) => {
  await expect(page.getByTestId("age-gate")).toBeVisible();
  await page.getByTestId("main-button").click();
  await expect(page.getByTestId("home")).toBeVisible();
  await page.getByTestId("category-hookah_tobacco").click();
  await expect(page.getByTestId("catalog")).toBeVisible();
  await page.getByTestId("product-card").first().click();
  await expect(page.getByTestId("product")).toBeVisible();
  await expect(
    page.getByText("Информация носит справочный характер"),
  ).toBeVisible();
});

test("survey and about screens open", async ({ page }) => {
  await page.getByTestId("main-button").click();
  await page.getByRole("button", { name: "Подобрать вкус" }).click();
  await expect(page.getByTestId("survey")).toBeVisible();
  await page.getByTestId("back-button").click();
  await expect(page.getByTestId("home")).toBeVisible();
  await page.getByRole("button", { name: "О приложении" }).click();
  await expect(page.getByTestId("about")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "О приложении" }),
  ).toBeVisible();
  await expect(page.getByText("Подбор сравнивает")).toBeVisible();
});

test.describe("theme", () => {
  test.use({ colorScheme: "dark" });
  test("dark background follows the system theme", async ({ page }) => {
    const background = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--tg-theme-bg-color")
        .trim(),
    );
    expect(background).toBe("#1c1c1d");
  });
});

test.describe("light theme", () => {
  test.use({ colorScheme: "light" });
  test("light background follows the system theme", async ({ page }) => {
    const background = await page.evaluate(() => {
      const value = getComputedStyle(document.documentElement)
        .getPropertyValue("--tg-theme-bg-color")
        .trim();
      const context = document.createElement("canvas").getContext("2d");
      if (!context) {
        return value;
      }
      context.fillStyle = value;
      return context.fillStyle;
    });
    expect(background).toBe("#ffffff");
  });
});
