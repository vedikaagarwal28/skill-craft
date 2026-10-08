import { test, expect } from '@playwright/test'

test('artisan bid becomes an employer contract with two-party payment confirmation', async ({ page }) => {
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
  await expect(page.getByText('Contract-linked score')).toBeVisible()
  await page.getByRole('link', { name: 'Back to artisans' }).click()
  await page.locator('.brand').click()
  await page.getByRole('link', { name: 'Explore opportunities' }).click()
  await expect(page.getByText('opportunities found')).toBeVisible()
  await page
    .getByRole('link', {
      name: /Create eight naturally dyed cotton table runners/,
    })
    .click()
  await expect(
    page.getByRole('heading', {
      name: /Create eight naturally dyed cotton table runners/,
    }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Sign in to bid' }).click()
  await page.getByRole('button', { name: 'Enter as artisan' }).click()
  const artisanNav = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(artisanNav.getByRole('link', { name: 'My workspace' })).toBeVisible()
  await expect(artisanNav.getByRole('link', { name: 'Find artisans' })).toHaveCount(0)
  await expect(artisanNav.getByRole('link', { name: 'My jobs' })).toHaveCount(0)
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Find work' })
    .click()
  await page
    .getByRole('link', {
      name: /Create eight naturally dyed cotton table runners/,
    })
    .click()
  await page.getByLabel('Your bid (₹)').fill('6100')
  await page.getByLabel('A short note').fill('I can complete these in ten days.')
  await page.getByRole('button', { name: 'Send your bid' }).click()
  await expect(page.getByText('Your bid was sent.')).toBeVisible()
  await page.getByRole('link', { name: 'My bids' }).click()
  await expect(page.getByText('₹6,100')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Enter as employer' }).click()
  const employerNav = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(employerNav.getByRole('link', { name: 'Hiring overview' })).toBeVisible()
  await expect(employerNav.getByRole('link', { name: 'Find work' })).toHaveCount(0)
  await expect(employerNav.getByRole('link', { name: 'My bids' })).toHaveCount(0)
  await page.getByRole('link', { name: 'My jobs' }).click()
  await page
    .getByRole('link', { name: /Handloom weaving/ })
    .first()
    .click()
  const ashaBid = page.locator('.bid-row').filter({ hasText: 'Asha Devi' })
  await expect(ashaBid).toContainText('₹6,100')
  await ashaBid.getByRole('button', { name: 'Accept' }).click()
  await expect(page.getByText('Bid accepted. A contract has been created.')).toBeVisible()
  await page.getByRole('link', { name: 'Hires & payments' }).click()
  const contract = page.locator('.contract-card').filter({ hasText: '₹6,100' })
  await contract.getByRole('button', { name: 'Record payment sent' }).click()
  await expect(contract.getByText('Waiting for the artisan to confirm receipt.')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Enter as artisan' }).click()
  await page.getByRole('link', { name: 'My agreements' }).click()
  const artisanContract = page.locator('.contract-card').filter({ hasText: '6,100' })
  await artisanContract.getByRole('button', { name: 'Confirm receipt' }).click()
  await expect(artisanContract.getByText('Paid')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Enter as employer' }).click()
  await page.getByRole('link', { name: 'Hires & payments' }).click()
  const paidContract = page.locator('.contract-card').filter({ hasText: '6,100' })
  await expect(paidContract.getByText('Paid')).toBeVisible()
  await paidContract.getByRole('button', { name: 'Leave a review' }).click()
  await page.getByLabel('Rating').selectOption('5')
  await page.getByLabel('Your feedback').fill('Beautiful work, delivered on time.')
  await page.getByRole('button', { name: 'Save review' }).click()
  await expect(paidContract.getByText('Contract review')).toBeVisible()
  expect(pageErrors).toEqual([])
})

test('long unbroken job text stays inside the card and employer mobile actions remain reachable', async ({
  page,
}) => {
  const longWord = 'verylongunbrokenprojectdescription'.repeat(5)
  await page.goto('/')
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Enter as employer' }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await expect(
    page
      .getByRole('navigation', { name: 'Main navigation' })
      .getByRole('link', { name: 'Post a job' }),
  ).toBeVisible()
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Post a job' })
    .click()
  await page.getByLabel('Skill needed').selectOption('Carpentry')
  await page.getByLabel('Describe the work').fill(longWord)
  await page.getByLabel('Location').fill('Mumbai')
  await page.getByLabel('Budget (₹)').fill('10000')
  await page.getByRole('button', { name: 'Publish job' }).click()
  await expect(page.getByRole('heading', { name: 'Carpentry project' })).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.getByRole('link', { name: 'Sign in' }).click()
  await page.getByRole('button', { name: 'Enter as artisan' }).click()
  await page.getByRole('button', { name: 'Toggle menu' }).click()
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Find work' })
    .click()
  const card = page.locator('.gig-card').filter({ hasText: longWord })
  await expect(card.getByRole('heading', { name: 'Carpentry project' })).toBeVisible()
  const fits = await card.evaluate((element) => {
    const cardBounds = element.getBoundingClientRect()
    const textBounds = element.querySelector('h3').getBoundingClientRect()
    return cardBounds.right <= window.innerWidth && textBounds.right <= cardBounds.right
  })
  expect(fits).toBe(true)
})
