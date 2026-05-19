import { test, expect } from '@playwright/test'

test('landing page renders the hero', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('hero')).toBeVisible()
})
