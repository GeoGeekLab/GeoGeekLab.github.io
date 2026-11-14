import {test,expect} from '@playwright/test';

test('Light unlocks three continuous optical experiments after the core journey',async({page},info)=>{
  test.skip(info.project.name!=='desktop-chromium','Light remains desktop-only');
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/lab.html?instrument=light',{waitUntil:'domcontentloaded'});
  const shell=page.locator('.play-v2-shell[data-play-kind="light"]');
  await expect(shell).toBeVisible({timeout:20000});
  for(const [choice,intervene] of [
    ['BLACK','REMOVE SCATTERING'],
    ['THE SIGNAL COLLAPSES','REMOVE BACKSCATTER'],
    ['NO · WATER SIGNAL REMAINS','REMOVE SURFACE REFLECTION']
  ]){
    await shell.getByRole('button',{name:choice,exact:true}).click();
    await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
    await shell.getByRole('button',{name:intervene,exact:true}).click();
    await shell.getByRole('button',{name:/^(NEXT EXPERIMENT|FINISH TRACE)$/}).click();
  }
  await expect(shell).toHaveAttribute('data-play-state','complete');
  const bonus=shell.getByRole('button',{name:'EXPLORE THREE MORE'});
  await expect(bonus).toBeVisible();
  await bonus.click();
  await expect(shell.locator('.light-journey-chapter')).toHaveText('ACT II / LIGHT IN MOTION');
  await expect(shell.locator('.light-journey-state')).toHaveText('04 OF 06');

  for(const [choice,action,mode,control,max] of [
    ['BLUE LIGHT WEAKENS MOST','LOWER THE SUN','sunset','RELATIVE AIR MASS','8'],
    ['RED LIGHT WEAKENS FASTER','SEND LIGHT 5 M DOWN','depth','WATER PATH LENGTH','8'],
    ['REFLECTION INCREASES','INCREASE INCIDENCE ANGLE','grazing','INCIDENCE FROM NORMAL','85']
  ]){
    await expect(shell).toHaveAttribute('data-light-phenomenon',mode);
    await shell.getByRole('button',{name:choice,exact:true}).click();
    await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
    await expect(shell.locator('.light-explorer')).toHaveCount(0);
    await shell.getByRole('button',{name:action,exact:true}).click();
    const slider=shell.getByRole('slider',{name:control});
    await expect(slider).toBeVisible();
    await expect(shell.locator('.light-spectrum-after')).toHaveCSS('opacity','1');
    const original=await shell.locator('.light-after-value').innerText();
    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveValue(max);
    await expect.poll(()=>shell.locator('.light-after-value').innerText()).not.toBe(original);
    await expect(shell.locator('.light-explore-live')).toContainText(max);
    await info.attach('advanced-light-'+mode,{body:await page.screenshot({animations:'disabled'}),contentType:'image/png'});
    await shell.getByRole('button',{name:/^(NEXT EXPERIMENT|FINISH TRACE)$/}).click();
  }
  await expect(shell).toHaveAttribute('data-play-state','complete');
  await expect(shell).toContainText('LIGHT MOVES THROUGH MATTER.');
  await shell.getByRole('button',{name:'PLAY AGAIN'}).click();
  await expect(shell.locator('.light-journey-state')).toHaveText('01 OF 03');
  await expect(shell).toHaveAttribute('data-play-state','question');
});
