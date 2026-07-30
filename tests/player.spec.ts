/**
 * Playwright E2E tests for Live777 Player.
 *
 * AI Vibe Coding: Each test has a clear name describing the expected behavior.
 * Assertions follow the Arrange-Act-Assert pattern for readability.
 */

import { test, expect } from '@playwright/test'

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
    // Camera publish UI should appear
    await expect(page.getByText('Start Publishing')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start Publishing' })).toBeVisible()
  })

  test('switches back from Publish to Play mode', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Publish' }).click()
    await page.getByRole('button', { name: 'Play' }).click()
    // URL input should be visible in Play mode
    await expect(page.getByRole('button', { name: 'Connect' })).toBeVisible()
  })
})

// ============ Channel Management ============

test.describe('Channel Management', () => {
  test('add channel form opens when + button clicked', async ({ page }) => {
    await page.goto('/')
    const addBtn = page.getByTitle('Add Channel')
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await expect(page.getByPlaceholder('Channel name')).toBeVisible()
      await expect(page.getByPlaceholder('WHEP or RTSP URL')).toBeVisible()
    }
  })

  test('adds a new channel to the list', async ({ page }) => {
    await page.goto('/')
    const addBtn = page.getByTitle('Add Channel')
    if (!(await addBtn.isVisible())) {
      // Sidebar might be hidden on mobile — skip
      return
    }
    await addBtn.click()
    await page.getByPlaceholder('WHEP or RTSP URL').fill('test-stream-id')
    await page.getByRole('button', { name: 'Add' }).click()
    // Channel should appear in list
    await expect(page.getByText('Channel 1')).toBeVisible()
  })
})

// ============ Grid Mode ============

test.describe('Grid Mode', () => {
  test('grid mode buttons are visible', async ({ page }) => {
    await page.goto('/')
    // Grid mode buttons: 1, 4, 9, 16
    await expect(page.getByTitle('1 stream', { exact: false })).toBeVisible()
  })

  test('clicking grid button changes active state', async ({ page }) => {
    await page.goto('/')
    const btn4 = page.getByTitle('4 streams', { exact: false })
    if (await btn4.isVisible()) {
      await btn4.click()
      // The button should have blue highlight after click
      await expect(btn4).toHaveClass(/blue/)
    }
  })
})

// ============ Settings ============

test.describe('Settings Panel', () => {
  test('settings modal opens on gear icon click', async ({ page }) => {
    await page.goto('/')
    const settingsBtn = page.getByTitle('Settings')
    await settingsBtn.click()
    await expect(page.getByText('Default Volume')).toBeVisible()
    await expect(page.getByText('Auto Play')).toBeVisible()
  })

  test('settings modal closes on Close button', async ({ page }) => {
    await page.goto('/')
    await page.getByTitle('Settings').click()
    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.getByText('Default Volume')).not.toBeVisible()
  })
})

// ============ Mobile Layout ============

test.describe('Mobile Layout', () => {
  test('shows mobile layout at iPhone viewport', async ({ page }) => {
    // Using the chromium-mobile project handles viewport automatically
    await page.goto('/')
    // Mobile layout should have the bottom channel drawer handle
    const drawerHandle = page.getByText('Channels', { exact: false })
    await expect(drawerHandle).toBeVisible()
  })

  test('channel drawer expands on tap', async ({ page }) => {
    await page.goto('/')
    const drawerBtn = page.getByText(/Channels/)
    if (await drawerBtn.isVisible()) {
      await drawerBtn.click()
      // Drawer should expand — form should be visible
      const addBtn = page.getByTitle('Add Channel')
      await expect(addBtn).toBeVisible({ timeout: 5000 })
    }
  })
})

// ============ Empty State ============

test.describe('Empty State', () => {
  test('shows idle message when no stream is connected', async ({ page }) => {
    await page.goto('/')
    // Should show the idle/empty state
    const idleText = page.getByText(/Enter a stream URL/, { exact: false })
    await expect(idleText.or(page.getByText(/Standalone Player/))).toBeVisible({ timeout: 5000 })
  })
})
