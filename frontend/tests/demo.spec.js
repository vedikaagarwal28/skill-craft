import { test, expect } from '@playwright/test'

test('artisan bid becomes an employer contract and verified payment', async ({ page }) => {
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good work/ })).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Find artisans' })
    .click()
  await expect(page.getByRole('heading', { name: 'Find skilled artisans.' })).toBeVisible()
  await page.getByRole('link', { name: /Asha Devi/ }).click()
  await expect(page.getByText('Verified trust score')).toBeVisible()
  await page.getByRole('link', { name: 'Back to artisans' }).click()
  await page.locator('.brand').click()
  await page.getByRole('link', { name: 'Explore opportunities' }).click()
  await expect(page.getByText('opportunities found')).toBeVisible()
  await page.getByRole('link', { name: /Create eight naturally dyed cotton table runners/ }).click()
  await expect(
    page.getByRole('heading', { name: /Create eight naturally dyed cotton table runners/ }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Sign in to bid' }).click()
  await page.getByRole('button', { name: 'Enter as artisan' }).click()
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Find work' })
    .click()
  await page.getByRole('link', { name: /Create eight naturally dyed cotton table runners/ }).click()
  await page.getByLabel('Your bid (₹)').fill('6100')
  await page.getByLabel('A short note').fill('I can complete these in ten days.')
  await page.getByRole('button', { name: 'Send your bid' }).click()
  await expect(page.getByText('Your bid was sent.')).toBeVisible()
  await page.getByRole('link', { name: 'My bids' }).click()
  await expect(page.getByText('₹6,100')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Enter as employer' }).click()
  await page.getByRole('link', { name: 'My jobs' }).click()
  await page
    .getByRole('link', { name: /Handloom weaving/ })
    .first()
    .click()
  const ashaBid = page.locator('.bid-row').filter({ hasText: 'Asha Devi' })
  await expect(ashaBid).toContainText('₹6,100')
  await ashaBid.getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByText('Bid accepted. A contract has been created.')).toBeVisible()
  await page.getByRole('link', { name: 'Contracts' }).click()
  const contract = page.locator('.contract-card').filter({ hasText: '₹6,100' })
  await contract.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(contract.getByText('Paid')).toBeVisible()
  await contract.getByRole('button', { name: 'Leave a review' }).click()
  await page.getByLabel('Rating').selectOption('5')
  await page.getByLabel('Your feedback').fill('Beautiful work, delivered on time.')
  await page.getByRole('button', { name: 'Save review' }).click()
  await expect(contract.getByText('Verified review')).toBeVisible()
  expect(pageErrors).toEqual([])
})
