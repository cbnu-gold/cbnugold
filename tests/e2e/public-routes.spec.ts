import { expect, test } from "@playwright/test";

const routes = ["/", "/about", "/activity", "/join", "/join/check", "/admin/login"];
const forbiddenCopy = [
  ["\uC704\uD0A4", "콘텐츠"].join(" "),
  ["성과와 기록을", "숨기지 않습니다"].join(" "),
  ["지원자가 동아리의", "실질성을 판단"].join(" "),
  ["대표", "금융 동아리"].join(" "),
  ["Designed", "Built"].join(" & "),
  ["cufa", "w" + "iki"].join("-"),
  ["Invest", "yourself"].join(" in "),
];

for (const route of routes) {
  test(`${route} renders without overflow or rejected copy`, async ({ page }, testInfo) => {
    const consoleMessages: string[] = [];
    page.on("console", (message) => {
      if (["error", "warning"].includes(message.type())) {
        consoleMessages.push(message.text());
      }
    });

    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);

    expect(response?.status(), route).toBe(200);
    await expect(page.locator("body")).toContainText(route === "/admin/login" ? "관리자 로그인" : "금은동");

    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      h1: document.querySelector("h1")?.textContent?.trim() ?? "",
      bodyText: document.body.innerText,
      images: Array.from(document.images).map((img) => ({
        alt: img.alt,
        width: img.naturalWidth,
        height: img.naturalHeight,
      })),
    }));

    expect(metrics.h1.length, `${route} h1`).toBeGreaterThan(0);
    expect(metrics.scrollWidth, `${route} horizontal overflow`).toBeLessThanOrEqual(metrics.innerWidth + 1);

    for (const text of forbiddenCopy) {
      expect(metrics.bodyText).not.toContain(text);
    }

    for (const image of metrics.images) {
      expect(image.width, `${route} image ${image.alt}`).toBeGreaterThan(0);
    }

    const relevantConsole = consoleMessages.filter((entry) => !entry.includes("Supabase에 연결할 수 없습니다"));
    expect(relevantConsole, `${route} console messages`).toEqual([]);

    await testInfo.attach(`${testInfo.project.name}-${route === "/" ? "home" : route.slice(1).replaceAll("/", "-")}.png`, {
      body: await page.screenshot({ fullPage: false }),
      contentType: "image/png",
    });
  });
}

test("mobile menu opens and closes", async ({ page }, testInfo) => {
  test.skip((testInfo.project.use.viewport?.width ?? 0) >= 768, "Mobile menu is hidden at md and wider breakpoints.");

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  await page.getByRole("button", { name: "메뉴 열기" }).click();
  await expect(page.getByRole("dialog", { name: "모바일 메뉴" })).toBeVisible();
  await expect(page.getByRole("link", { name: "지원하기" })).toBeVisible();

  await page.locator('label[aria-label="메뉴 닫기"]').click();
  await expect(page.getByRole("dialog", { name: "모바일 메뉴" })).toBeHidden();
});
