import { test, expect } from '@playwright/test'
test('high-fidelity OVERPASS landing at /overpass/', async ({page},info)=>{
  const errors=[]
  const localFailures=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('response',r=>{
    if(r.status()>=400 && r.url().startsWith('http://127.0.0.1:4173/')) localFailures.push(r.status()+' '+r.url())
  })
  await page.goto('/overpass/',{waitUntil:'domcontentloaded'})
  await expect(page).toHaveTitle(/OVERPASS — GeoGeek Observatory/)
  await expect(page.getByText('Something', {exact:false}).first()).toBeVisible({timeout:30000})
  await expect(page.getByRole('button',{name:/How this works/i})).toBeVisible()
  await expect(page.locator('canvas').first()).toBeAttached({timeout:30000})
  await page.waitForTimeout(1500)
  await page.screenshot({path:info.outputPath('landing.png'),fullPage:true})
  expect(localFailures).toEqual([])
  expect(errors).toEqual([])
})
test('original About entry remains accessible',async({page})=>{
  await page.goto('/overpass/',{waitUntil:'domcontentloaded'})
  await page.getByRole('button',{name:/How this works/i}).click()
  await expect(page.getByText('The short version',{exact:false}).first()).toBeVisible({timeout:30000})
})
