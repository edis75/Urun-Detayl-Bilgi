import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Mount the actual Web gallery components without changing the Web API/database.
test('public gallery chooses primary, switches thumbnails and preserves mobile layout',async({page})=>{
 page.on('pageerror',error=>console.error(error.message));
 const files=['../ProductCompare.Web/src/components/common/ProductImage.tsx','../ProductCompare.Web/src/components/product/ProductGallery.tsx'];
 const source=files.map(file=>readFileSync(file,'utf8').replace(/^import .*;\r?$/gm,'').replace(/export function /g,'function ')).join('\n');
 const compiled=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.React,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText;
 const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=';
 const images=[{id:1,imageUrl:pixel+'#first',isPrimary:false,sortOrder:0},{id:2,imageUrl:pixel+'#cover',isPrimary:true,sortOrder:1},{id:3,imageUrl:pixel+'#third',isPrimary:false,sortOrder:2}];
 const {browserHash}=JSON.parse(readFileSync('node_modules/.vite/deps/_metadata.json','utf8'));
 await page.route('**/gallery-harness',route=>route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">
 import React from '/node_modules/.vite/deps/react.js?v=${browserHash}';
 import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js?v=${browserHash}';
 const {useState}=React;const {createRoot}=ReactDOM;
 ${compiled}
 createRoot(document.getElementById('root')).render(React.createElement('div',{className:'container product-hero'},React.createElement('div',{className:'detail-image'},React.createElement(ProductGallery,{images:${JSON.stringify(images)},fallback:null,name:'Gallery test'})),React.createElement('div',null,'Product information')));
 </script>`}));
 await page.goto('http://localhost:5173/gallery-harness');
 await page.addStyleTag({content:readFileSync('../ProductCompare.Web/src/app/globals.css','utf8').replace(/@import[^;]+;/g,'')});
 const main=page.locator('.product-gallery-main img');
 await expect(main).toHaveAttribute('src',pixel+'#cover');
 const buttons=page.getByRole('group',{name:'Ürün görselleri'}).getByRole('button');
 await expect(buttons).toHaveCount(3);await expect(buttons.nth(0)).toHaveAttribute('aria-pressed','true');
 await buttons.nth(1).click();await expect(main).toHaveAttribute('src',pixel+'#first');
 await buttons.nth(2).focus();await page.keyboard.press('Enter');await expect(main).toHaveAttribute('src',pixel+'#third');
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(main).toBeVisible();
});
