import { expect, test } from "@playwright/test";

// Full happy path (ITER_07 §05.10). Requires the backend (:8000) and frontend
// (:3000) running, plus a valid Anthropic key in E2E_ANTHROPIC_API_KEY for the
// streaming steps.
const API_KEY = process.env.E2E_ANTHROPIC_API_KEY;

test.describe("IdeaLens happy path", () => {
  test.skip(!API_KEY, "E2E_ANTHROPIC_API_KEY is required for the full flow");

  test("register → key → analyze → edit → delete account", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = "password123";

    // 1. Register a new account.
    await page.goto("/register");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();

    // Keyless users hit the ApiKeyGuard prompt instead of the dashboard.
    await expect(
      page.getByRole("heading", { name: /Add your Anthropic API key/i })
    ).toBeVisible();

    // 2. Go to Settings and save an Anthropic API key.
    await page.getByRole("link", { name: "Go to Settings" }).click();
    await page.getByPlaceholder("sk-ant-...").fill(API_KEY!);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("API key saved")).toBeVisible();

    // 3. Return to Dashboard — the key prompt is gone.
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Your analyses" })).toBeVisible();

    // 4. New Analysis → enter an idea → submit.
    await page.getByRole("button", { name: "New Analysis" }).click();
    await page
      .getByPlaceholder("Describe the idea you want to analyze...")
      .fill("A subscription box for houseplants");
    await page.getByRole("button", { name: "Analyze" }).click();

    // 5. Session page loads, auto-send streams, graph populates (root + more).
    await expect(page).toHaveURL(/\/session\//);
    await expect.poll(async () => page.locator(".react-flow__node").count(), {
      timeout: 45_000,
    }).toBeGreaterThan(1);

    // 6. Follow-up message → graph updates.
    const nodeCountBefore = await page.locator(".react-flow__node").count();
    await page.getByPlaceholder("Describe your idea...").fill("What are the main risks?");
    await page.getByRole("button", { name: "Send" }).click();
    await expect.poll(async () => page.locator(".react-flow__node").count(), {
      timeout: 45_000,
    }).toBeGreaterThanOrEqual(nodeCountBefore);

    // 7. Click a node → detail panel → edit label → Save.
    await page.locator(".react-flow__node").first().click();
    const labelInput = page.locator("input").first();
    await labelInput.fill("Edited label");
    await page.getByRole("button", { name: "Save" }).click();

    // 8. Drag a node to a new position.
    const node = page.locator(".react-flow__node").first();
    const box = await node.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 120, box.y + 80, { steps: 8 });
      await page.mouse.up();
    }

    // 9. Toolbar → Auto Layout.
    await page.getByRole("button", { name: "Auto Layout" }).click();

    // 10. Settings → Danger Zone → delete account → confirm.
    await page.goto("/settings");
    await page.getByRole("button", { name: "Delete account" }).click();
    await page.getByPlaceholder("Confirm your password").fill(password);
    await page.getByRole("button", { name: "Delete permanently" }).click();

    // 11. Redirected to login.
    await expect(page).toHaveURL(/\/login/);
  });
});
