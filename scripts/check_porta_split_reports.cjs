const puppeteer=require('puppeteer'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage(),errors=[],bad=[],qa=path.resolve('.codex-artifacts/porta-split-qa');fs.mkdirSync(qa,{recursive:true});
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.setViewport({width:1440,height:1050,deviceScaleFactor:1});
 const origin='http://127.0.0.1:8000/',go=slug=>page.goto(origin+'reports/'+slug+'/',{waitUntil:'networkidle0'});
 try{
  await go('porta-test-plan');await page.waitForFunction(()=>window.__testPlan?.ready&&window.__trialScene?.ready);
  assert.equal(await page.$('#sim-scene'),null);assert.equal(await page.$('#pec-scene'),null);assert.equal(await page.$('#connected-progress-status'),null);
  assert.equal(await page.$$eval('.document-nav a',es=>es.length),2);
  await page.screenshot({path:path.join(qa,'plan-desktop.png')});
  await page.click('#show-grid');assert.equal(await page.evaluate(()=>__trialScene.snapshot().gridVisible),true);
  await page.$eval('#coupon-panel',e=>e.scrollIntoView({behavior:'instant',block:'center'}));
  await (await page.$('#coupon-panel')).screenshot({path:'reports/porta-test-plan/cover.png'});
  await page.click('a[href="#evidence"]');assert.equal(await page.$eval('#evidence',e=>e.querySelectorAll('details[open]').length),0);
  await page.goto(origin+'reports/porta-test-plan/#cable-spec-section',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>document.getElementById('cable-spec-section').open);
  await go('porta-test-results');await page.waitForFunction(()=>window.__testResults?.ready);
  assert.equal(await page.$$eval('.result-card',es=>es.length),5);assert.equal(await page.$$eval('a.result-card',es=>es.length),3);
  await page.screenshot({path:path.join(qa,'results-desktop.png')});await page.screenshot({path:'reports/porta-test-results/cover.png'});
  await page.click('.philosophy summary');assert.equal(await page.$eval('.philosophy',e=>e.open),true);
  await go('porta-test-00');await page.waitForFunction(()=>window.__test00?.ready);
  const source=JSON.parse(fs.readFileSync('reports/porta-test-00/data/results.json','utf8'));
  assert.equal(await page.evaluate(()=>__test00.snapshot().cells),246402);
  for(const q of['magnitude','phase']){
   await page.select('#quantity',q);
   for(const i of[0,9,18]){
    await page.$eval('#frequency',(e,i)=>{e.value=i;e.dispatchEvent(new Event('input',{bubbles:true}));},i);
    const key=q==='magnitude'?'transmissionMagnitude_dB':'transmissionPhase_deg',expected=source.curves.map(c=>c[key][i]);
    const text=await page.$eval('#point-values',e=>e.textContent);for(const value of expected)assert(text.includes(value.toFixed(4)));
   }
  }
  await page.click('#mesh-fine');assert.equal(await page.evaluate(()=>__test00.snapshot().cells),766656);
  await page.click('#grid');assert.equal(await page.evaluate(()=>__test00.snapshot().gridVisible),false);await page.click('#grid');
  await page.click('#closeup');const close=await page.evaluate(()=>__test00.snapshot().camera);
  await page.focus('#reference-scene');await page.keyboard.press('ArrowLeft');assert.notDeepEqual(await page.evaluate(()=>__test00.snapshot().camera),close);
  await page.keyboard.press('Home');await page.click('#mesh-base');await page.select('#quantity','magnitude');
  await page.$eval('#frequency',e=>{e.value=9;e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(qa,'test00-desktop.png')});
  await (await page.$('#comparison')).screenshot({path:'reports/porta-test-00/cover.png'});
  const links=await page.$$eval('#evidence-links a',es=>es.map(a=>a.href));for(const link of links){const r=await page.evaluate(async url=>(await fetch(url)).status,link);assert.equal(r,200);}
  await go('porta-test-01');await page.waitForFunction(()=>window.__test01?.progress);
  assert.equal(await page.$$eval('.run-card',es=>es.length),4);
  await page.$eval('#wiring-mixed',e=>{let p=e;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}});await page.click('#wiring-mixed');assert.equal(await page.evaluate(()=>__test01.snapshot().wiring),'mixed');assert((await page.$eval('#wiring-title',e=>e.textContent)).includes('각 쌍'));
  await page.click('#wiring-same');await page.screenshot({path:path.join(qa,'test01-desktop.png')});
  await (await page.$('#comparison')).screenshot({path:'reports/porta-test-01/cover.png'});
  for(const slug of['porta-test-plan','porta-test-results','porta-test-00','porta-test-01']){
   await page.setViewport({width:390,height:844});await go(slug);
   if(slug==='porta-test-plan')await page.waitForFunction(()=>window.__trialScene?.ready);
   if(slug==='porta-test-00')await page.waitForFunction(()=>window.__test00?.ready);
   if(slug==='porta-test-01')await page.waitForFunction(()=>window.__test01?.progress);
   if(slug==='porta-test-results')await page.waitForFunction(()=>window.__testResults?.ready);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow '+slug);
   await page.screenshot({path:path.join(qa,slug+'-mobile.png'),fullPage:true});
   if(slug==='porta-test-00'){await page.click('#mesh-fine');assert.equal(await page.evaluate(()=>__test00.snapshot().mesh),'fine');}
   await page.goto(origin,{waitUntil:'networkidle0'});
   await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('a[href="reports/'+slug+'/"]')]);
   await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('header>a:first-child')]);assert.equal(page.url(),origin);
  }
  await go('porta-test-plan');
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('.document-nav a[href="../porta-test-results/"]')]);assert(page.url().includes('/porta-test-results/'));
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('a.result-card[href="../porta-test-00/"]')]);assert(page.url().includes('/porta-test-00/'));
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('.document-nav a[href="../porta-test-01/"]')]);assert(page.url().includes('/porta-test-01/'));
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('header>a:last-child')]);await page.waitForFunction(()=>window.__testPlan?.ready);assert.equal(await page.evaluate(()=>__testPlan.snapshot().test),'power');
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log(JSON.stringify({checked:'plan, result overview and two individual results; source values; mesh, graph, keyboard; configuration toggles; all navigation; mobile; no 404s',errors,bad,qa}));
 }catch(e){console.error(e,{errors,bad});await page.screenshot({path:path.join(qa,'failure.png')});process.exitCode=1;}finally{await browser.close();}
})();
