/**
 * Playwright E2E tests for Live777 Player.
 *
 * AI Vibe Coding: Each test has a clear name describing the expected behavior.
 * Assertions follow the Arrange-Act-Assert pattern for readability.
 *
 * Tests are designed to work across both projects (desktop + mobile).
 * The `test.skip()` or conditional guards prevent false positives.
 */

import { test, expect } from '@playwright/test'

// Helper: determine if running in desktop or mobile project
function isMobile(projectName: string): boolean {
  return projectName.includes('mobile')
}

// ============ URL Input ============

test.describe('URL Input', () => {
  test('connect button is disabled when URL input is empty', async ({ page }) => {
    await page.goto('/')
    const connectBtn = page.getByRole('button', { name: 'Connect' })
    await expect(connectBtn).toBeDisabled()
  })

  test('connect button becomes enabled when URL is entered', async ({ page }) => {
    await page.goto('/')
    const input = page.getByPlaceholder(/whep.*stream-id/i)
    await input.fill('test-stream-id')
    const connectBtn = page.getByRole('button', { name: 'Connect' })
    await expect(connectBtn).toBeEnabled()
  })

  test('protocol selector defaults to WHEP', async ({ page }) => {
    await page.goto('/')
    const select = page.getByRole('combobox')
    await expect(select).toHaveValue('whep')
  })

  test('protocol selector switches placeholder on RTSP select', async ({ page }) => {
    await page.goto('/')
    const select = page.getByRole('combobox')
    await select.selectOption('rtsp')
    const input = page.getByPlaceholder(/rtsp/i)
    await expect(input).toBeVisible()
  })
})

// ============ Mode Switch ============

test.describe('Mode Switch', () => {
  test('switches from Play to Publish mode', async ({ page }) => {
    await page.goto('/')
    const publishBtn = page.getByRole('button', { name: 'Publish' })
    await publishBtn.click()
    await expect(page.getByRole('button', { name: 'Start Publishing' })).toBeVisible()
  })

  test('switches back from Publish to Play mode', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Publish' }).click()
    await page.getByRole('button', { name: 'Play' }).click()
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible()
  })
})

// ============ Channel Management (desktop only — sidebar) ============

test.describe('Channel Management', () => {
  test('add channel form opens when + button clicked', async ({ page }, testInfo) => {
    // Sidebar is only visible on desktop (>=768px viewport)
    if (isMobile(testInfo.project.name)) {
      test.skip()
    }
    await page.goto('/')
    const addBtn = page.getByTitle('Add Channel')
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    await expect(page.getByPlaceholder('Channel name')).toBeVisible()
    await expect(page.getByPlaceholder('WHEP or RTSP URL')).toBeVisible()
  })

  test('adds a new channel to the list', async ({ page }, testInfo) => {
    if (isMobile(testInfo.project.name)) {
      test.skip()
    }
    await page.goto('/')
    const addBtn = page.getByTitle('Add Channel')
    await addBtn.click()
    await page.getByPlaceholder('WHEP or RTSP URL').fill('test-stream-id')
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByText('Channel 1')).toBeVisible()
  })
})

// ============ Grid Mode ============

test.describe('Grid Mode', () => {
  test('grid mode buttons are visible in top bar', async ({ page }, testInfo) => {
    // On desktop: grid buttons in top bar always visible
    // On mobile: grid buttons only rendered when connected === true
    if (isMobile(testInfo.project.name)) {
      test.skip()
    }
    await page.goto('/')
    const btn1 = page.getByTitle('1 stream').first()
    await expect(btn1).toBeVisible({ timeout: 5000 })
  })

  test('clicking grid button changes active state on desktop', async ({ page }, testInfo) => {
    if (isMobile(testInfo.project.name)) {
      test.skip() // grid buttons hidden on mobile until connected
    }
    await page.goto('/')
    // Scope to top bar to avoid strict-mode violation (sidebar has duplicate titles)
    const topBarGrid = page.locator('.flex.items-center.gap-3, .flex.items-center.gap-0\\.5').first()
    const btn4 = topBarGrid.getByTitle('4 streams')
    await btn4.click()
    // Active button gets blue highlight: bg-blue-500/30 or text-blue-300
    await expect(btn4).toHaveClass(/bg-blue-500\\\/30|text-blue-300/)
  })
})

// ============ Settings ============

test.describe('Settings Panel', () => {
  test('settings modal opens on gear icon click', async ({ page }) => {
    await page.goto('/')
    // Multiple settings buttons may exist (mobile + desktop layouts) — use .first()
    const settingsBtn = page.getByTitle('Settings').first()
    await settingsBtn.click()
    await expect(page.getByText('Default Volume')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Auto Play')).toBeVisible()
  })

  test('settings modal closes on Close button', async ({ page }) => {
    await page.goto('/')
    await page.getByTitle('Settings').first().click()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByText('Default Volume')).not.toBeVisible()
  })
})

// ============ Mobile Layout ============

test.describe('Mobile Layout', () => {
  test('shows mobile layout at iPhone viewport', async ({ page }, testInfo) => {
    if (!isMobile(testInfo.project.name)) {
      test.skip()
    }
    await page.goto('/')
    // Mobile layout shows the bottom channel drawer handle
    const drawerHandle = page.getByText(/Channels/)
    await expect(drawerHandle).toBeVisible()
  })

  test('channel drawer expands on tap', async ({ page }, testInfo) => {
    if (!isMobile(testInfo.project.name)) {
      test.skip()
    }
    await page.goto('/')
    const drawerBtn = page.getByText(/Channels/).first()
    await drawerBtn.click()
    // Drawer expands — the Add Channel button becomes visible
    await expect(page.getByTitle('Add Channel')).toBeVisible({ timeout: 5000 })
  })
})

// ============ Empty State ============

test.describe('Empty State', () => {
  test('shows idle message when no stream is connected', async ({ page }) => {
    await page.goto('/')
    // Desktop shows "Standalone Player"; mobile shows "Enter a stream URL"
    const idleText = page.getByText(/Enter a stream URL|Standalone Player/)
    await expect(idleText).toBeVisible({ timeout: 5000 })
  })
})
