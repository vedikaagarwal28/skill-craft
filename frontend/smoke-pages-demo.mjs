import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

const root = process.env.DEMO_URL || 'http://127.0.0.1:4173/skillcraft-bcse302p-demo/'
const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
page.on('pageerror', (error) => errors.push(error.message))

const route = async (path) => page.goto(`${root}#${path}`)
const enter = async (role) => {
  await route('/signin')
  await page.getByRole('button', { name: `Enter as ${role}` }).click()
  await page.getByRole('heading', { name: /Good to see you/ }).waitFor()
}
const leave = async () => page.getByRole('button', { name: 'Sign out' }).click()

try {
  await route('/')
  await page.getByRole('heading', { name: /Good work/ }).waitFor()

  await enter('employer')
  await route('/post-job')
  await page.getByLabel('Skill needed').selectOption('Handloom weaving')
  await page.getByLabel('Describe the work').fill('Make six cotton runners for a local exhibition.')
  await page.getByLabel('Location').fill('Pune, Maharashtra')
  await page.getByLabel(/Budget/).fill('6400')
  await page.getByRole('button', { name: 'Publish job' }).click()
  await page.waitForURL(/#\/gigs\/\d+$/)
  const jobUrl = page.url()
  await leave()

  await enter('artisan')
  await page.goto(jobUrl)
  await page.getByLabel(/Your bid/).fill('6000')
  await page.getByLabel('A short note').fill('Delivery within twelve days.')
  await page.getByRole('button', { name: 'Send your bid' }).click()
  await page.getByText('Your bid was sent.').waitFor()
  await leave()

  await enter('employer')
  await page.goto(jobUrl)
  await page.locator('.bid-row').filter({ hasText: 'Asha' }).getByRole('button', { name: 'Accept' }).click()
  await page.getByText('Bid accepted. A contract has been created.').waitFor()
  await route('/contracts')
  const employerContract = page.locator('.contract-card').filter({ hasText: '6,000' }).first()
  await employerContract.getByRole('button', { name: 'Record payment sent' }).click()
  await page.getByText('Payment sent recorded.').waitFor()
  await leave()

  await enter('artisan')
  await route('/contracts')
  const artisanContract = page.locator('.contract-card').filter({ hasText: '6,000' }).first()
  await artisanContract.getByRole('button', { name: 'Confirm receipt' }).click()
  await page.getByText('Receipt confirmed.').waitFor()
  await leave()

  await enter('employer')
  await route('/contracts')
  const paidContract = page.locator('.contract-card').filter({ hasText: '6,000' }).first()
  await paidContract.getByRole('button', { name: 'Leave a review' }).click()
  await page.getByLabel('Rating').selectOption('5')
  await page.getByLabel('Your feedback').fill('Careful work and clear communication.')
  await page.getByRole('button', { name: 'Save review' }).click()
  await page.getByText('Review saved.').waitFor()
  await page.goto(`${root}?reset=1#/signin`)
  await page.getByRole('button', { name: 'Enter as artisan' }).waitFor()
  assert.equal(await page.evaluate(() => localStorage.getItem('skillcraft-v2-demo-state')), null)
  assert.deepEqual(errors, [])
  console.log(`PASS: public-demo workflow at ${root}`)
} finally {
  await browser.close()
}
