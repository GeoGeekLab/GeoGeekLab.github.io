import {test,expect} from '@playwright/test';
async function app(page,tab){
 await page.goto('/water/workbench-v10-2/app/index.html?embed=1',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#mainNav [data-tab]')).toHaveCount(9,{timeout:20000});
 await page.locator('#tab-'+tab).click();
 return page;
}
test('UX-071 atmospheric correction distinguishes same-model closure, perturbation and absent validation',async({page})=>{
 const p=await app(page,'ac');
 await expect(p.locator('.p7-ac')).toBeVisible();
 await expect(p.locator('.p7-steps [role="listitem"]')).toHaveCount(4);
 await expect(p.locator('.p7-no-validation')).toContainText('NOT PERFORMED');
 await expect(p.locator('#p7-ac-state')).toContainText('MATCHED FORWARD / INVERSE');
 await p.locator('[data-errorpreset="aot"]').click();
 await expect(p.locator('#p7-ac-state')).toContainText('PERTURBED ASSUMED ATMOSPHERE');
 await expect(p.locator('.p7-interpret')).toContainText('not an empirical correction error');
 await p.locator('#plotNav [data-plot="error"]').click();
 await expect(p.locator('#p7-ac-values')).toBeAttached();
 await p.locator('#p7-ac-values summary').click();
 await expect(p.locator('#p7-ac-values tbody tr')).toHaveCount(14);
 await expect(p.locator('.p7-ac')).toContainText('Signed mean residual');
 await p.locator('[data-match="true"]').click();
 await expect(p.locator('#p7-ac-state')).toContainText('MATCHED FORWARD / INVERSE');
});
test('UX-072 comparison differentiates live B, saved B and reset action without changing working parameters',async({page})=>{
 const p=await app(page,'compare');
 await expect(p.locator('.p7-compare')).toBeVisible();
 await expect(p.locator('.p7-identity-grid')).toContainText('LIVE CURRENT STATE');
 await p.locator('[data-save="a"]').click();
 await p.locator('[data-save="b"]').click();
 await expect(p.locator('.p7-identity-grid')).toContainText('SAVED SNAPSHOT');
 await expect(p.locator('[data-compare-source="saved"]')).toHaveAttribute('aria-pressed','true');
 const oldParameter=await p.locator('#num-chl').inputValue();
 await p.locator('#num-chl').fill('5');
 await p.locator('#num-chl').dispatchEvent('change');
 await expect(p.locator('#num-chl')).toHaveValue('5');
 await expect(p.locator('.p7-identity-grid')).toContainText('Frozen values');
 await p.locator('[data-compare-reset="live"]').click();
 await expect(p.locator('.p7-identity-grid')).toContainText('LIVE CURRENT STATE');
 await expect(p.locator('#num-chl')).toHaveValue('5');
 await p.locator('[data-compare-reset="clear-b"]').click();
 await expect(p.locator('[data-compare-reset="clear-b"]')).toBeDisabled();
 await p.locator('[data-compare-reset="defaults"]').click();
 await expect(p.locator('.p7-identity-grid')).toContainText('Reference scenario');
 await expect(p.locator('#num-chl')).toHaveValue('5');
 await p.locator('#p7-compare-spectrum summary').click();
 await expect(p.locator('#p7-compare-spectrum tbody tr')).toHaveCount(14);
 await expect(p.locator('.p7-table-scroll').last()).toBeVisible();
});
test('UX-073 finite difference explains units and boundary clipping, preserving band chart',async({page})=>{
 const p=await app(page,'sensitivity');
 await expect(p.locator('.p7-sensitivity')).toBeVisible();
 await expect(p.locator('.p7-sensitivity')).toContainText('sr⁻¹ per');
 await expect(p.locator('.p7-sensitivity')).toContainText('Dimensionless elasticity');
 await p.locator('#num-chl').fill('0.02');
 await p.locator('#num-chl').dispatchEvent('change');
 await expect(p.locator('.p7-interpret')).toContainText('ONE-SIDED BOUNDARY');
 await expect(p.locator('.p7-sensitivity')).toContainText('not measurement uncertainty');
 await p.locator('#plotNav [data-plot="bands"]').click();
 await expect(p.locator('.band-response-panel')).toBeVisible();
 await expect(p.locator('#p7-sens-spectrum')).toBeAttached();
 await p.locator('#p7-sens-spectrum summary').click();
 await expect(p.locator('#p7-sens-spectrum tbody tr')).toHaveCount(14);
});
test('Stage 7 responsive: AC/compare/sensitivity tables scroll locally without page overflow at 390px',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await app(page,'ac');
 for(const t of ['ac','compare','sensitivity']){
  if(t!=='ac')await page.locator('#tab-'+t).click();
  const target=page.locator('.p7-'+t);
  await expect(target).toBeVisible();
  const id=t==='ac'?'p7-ac-values':t==='compare'?'p7-compare-spectrum':'p7-sens-spectrum';
  await page.locator('#'+id+' summary').click();
  await page.locator('#'+id+' .p7-table-scroll').focus();
  await expect(page.locator('#'+id+' .p7-table-scroll')).toBeFocused();
  const widths=await target.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client+2);
 }
});
test('P0 #148: persisted Stage 7 initial tab does not boot before critical analysis script',async({page})=>{
 await page.addInitScript(()=>{
  try{localStorage.setItem('water_ui_geo_v102',JSON.stringify({tab:'ac',plot:'correction'}));}catch{}
 });
 await page.goto('/lab.html?instrument=water&waterVersion=v102#l13',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-water-ui-version','v102',{timeout:25000});
 const iframe=page.frameLocator('#instrumentStage iframe.water-v102-frame');
 await expect(iframe.locator('.p7-ac')).toBeVisible({timeout:20000});
 await expect(iframe.locator('.p7-no-validation')).toContainText('NOT PERFORMED');
});
