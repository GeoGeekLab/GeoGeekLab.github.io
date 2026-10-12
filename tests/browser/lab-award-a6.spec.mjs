import {createRequire} from 'node:module';
import {test,expect} from '@playwright/test';

const require=createRequire(import.meta.url);
const axePath=require.resolve('axe-core/axe.min.js');

async function openWater(page){
  await page.goto('/lab.html?release=20261011v107watercache1&instrument=water#l13',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-lab-award-shell','a4',{timeout:30000});
  await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-lab-award-polish','a5',{timeout:30000});
  const iframe=page.locator('#instrumentStage iframe.water-v102-frame');
  await expect(iframe).toBeVisible({timeout:45000});
  const handle=await iframe.elementHandle();
  const frame=await handle.contentFrame();
  await frame.waitForSelector('html[data-water-award-concept="a3"][data-water-award-polish="a5"]',{timeout:30000});
  return frame;
}

test('A6 keeps Observatory orientation microtype legible and focus explicit',async({page})=>{
  await openWater(page);

  for(const selector of [
    '.instrument-breadcrumb',
    '.instrument-award-context-kicker',
    '.instrument-award-context-mode',
    '.instrument-award-context small'
  ]){
    const size=await page.locator(selector).evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
    expect(size,selector).toBeGreaterThanOrEqual(10);
  }

  const close=page.locator('#instrumentClose');
  await close.focus();
  const focus=await close.evaluate(node=>({
    outline:getComputedStyle(node).outlineStyle,
    shadow:getComputedStyle(node).boxShadow
  }));
  expect(focus.outline!=='none'||focus.shadow!=='none').toBe(true);
});

test('A6 Water microtype, spectral text and tools remain keyboard-usable',async({page})=>{
  const frame=await openWater(page);

  for(const selector of [
    '.ui-nav-heading',
    '.plot-flag',
    '.award-spectrum-ruler-head span'
  ]){
    const size=await frame.locator(selector).first().evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
    expect(size,selector).toBeGreaterThanOrEqual(10);
  }

  const summary=frame.locator('#toolsMenu > summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(summary).toHaveAttribute('aria-expanded','true');

  await page.keyboard.press('Tab');
  await expect(frame.locator('#exportBtn')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(summary).toBeFocused();
  await expect(summary).toHaveAttribute('aria-expanded','false');

  const textColor=await frame.locator('#probeValue').evaluate(node=>getComputedStyle(node).color);
  expect(textColor).not.toBe('rgb(0, 0, 0)');
});

test('A6 Water award UI has no critical automated accessibility violations',async({page},testInfo)=>{
  const frame=await openWater(page);
  await frame.addScriptTag({path:axePath});
  const violations=await frame.evaluate(async()=>{
    const result=await window.axe.run(document,{
      runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']},
      resultTypes:['violations']
    });
    return result.violations;
  });

  await testInfo.attach('water-a6-axe-violations.json',{
    body:Buffer.from(JSON.stringify(violations,null,2)),
    contentType:'application/json'
  });

  const critical=violations.filter(item=>item.impact==='critical');
  const serious=violations.filter(item=>item.impact==='serious');
  console.log('[A6 axe] critical='+critical.length+' serious='+serious.length+' total='+violations.length);
  expect(critical).toEqual([]);
});
