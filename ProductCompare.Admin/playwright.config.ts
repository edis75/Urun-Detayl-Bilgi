import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./tests',workers:1,retries:0,reporter:'list',use:{browserName:'chromium',headless:true,viewport:{width:1440,height:1000}},outputDir:'./test-results'});

