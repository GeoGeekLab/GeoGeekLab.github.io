import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir:'tests/overpass',
  timeout:60000,
  expect:{timeout:20000},
  retries:1,
  use:{
    baseURL:'http://127.0.0.1:4173',
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    launchOptions:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
  },
  projects:[
    {name:'desktop-chromium',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:900}}},
    {name:'mobile-chromium',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844},isMobile:true,hasTouch:true}}
  ],
  webServer:{
    command:'python3 -m http.server 4173 --bind 127.0.0.1 --directory dist',
    url:'http://127.0.0.1:4173/overpass/',
    reuseExistingServer:false,timeout:30000
  },
  outputDir:'test-results/overpass',
  reporter:[['list']]
})
