/* Final publication checks for the results hub, TEST00 and current TEST01 UI. */
const puppeteer=require('puppeteer'),assert=require('assert'),fs=require('fs'),path=require('path');
const origin=(process.env.ATLAS_ORIGIN||'http://127.0.0.1:8000').replace(/\/$/,'')+'/';
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage(),errors=[],bad=[],qa=path.resolve('.codex-artifacts/porta-publication-qa');fs.mkdirSync(qa,{recursive:true});
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.setViewport({width:1440,height:1000});
 const go=slug=>page.goto(origin+'reports/'+slug+'/',{waitUntil:'networkidle0'});
 try{
  await go('porta-test-results');await page.waitForFunction(()=>window.__testResults?.ready);
  assert.equal(await page.$$eval('a.result-card',es=>es.length),3);await page.click('.philosophy summary');assert(await page.$eval('.philosophy',e=>e.open));
  await go('porta-test-00');await page.waitForFunction(()=>window.__test00?.ready);
  const reference=JSON.parse(fs.readFileSync('reports/porta-test-00/data/results.json','utf8'));
  for(const q of ['magnitude','phase']){await page.select('#quantity',q);for(const i of [0,9,18]){
   await page.$eval('#frequency',(e,i)=>{e.value=i;e.dispatchEvent(new Event('input',{bubbles:true}));},i);
   const text=await page.$eval('#point-values',e=>e.textContent),key=q==='magnitude'?'transmissionMagnitude_dB':'transmissionPhase_deg';
   for(const curve of reference.curves)assert(text.includes(curve[key][i].toFixed(4)));
  }}
  await page.click('#mesh-fine');assert.equal(await page.evaluate(()=>__test00.snapshot().cells),766656);
  await page.click('#grid');assert.equal(await page.evaluate(()=>__test00.snapshot().gridVisible),false);
  await page.click('#closeup');const camera=await page.evaluate(()=>__test00.snapshot().camera);
  await page.focus('#reference-scene');await page.keyboard.press('ArrowLeft');assert.notDeepEqual(await page.evaluate(()=>__test00.snapshot().camera),camera);await page.keyboard.press('Home');
  for(const link of await page.$$eval('#evidence-links a',es=>es.map(e=>e.href)))assert.equal(await page.evaluate(async url=>(await fetch(url)).status,link),200);
  await go('porta-test-01');await page.waitForFunction(()=>document.querySelectorAll('#candidate-list button').length===5&&document.querySelector('#selected-value').textContent.includes('mV/V'));
  const data=JSON.parse(fs.readFileSync('reports/porta-test-01/data/topology-results.json','utf8'));
  assert(data.topologyScreeningComplete);assert.equal(data.fineChecks.length,2);assert.equal(data.scientificVerdictComplete,false);
  assert((await page.$eval('#status-title',e=>e.textContent)).includes('완료'));
  let count=0;
  for(const c of data.cases){
   const response=page.waitForResponse(r=>r.url().endsWith('/'+c.model)&&r.status()===200);
   await page.click('#candidate-list [data-id="'+c.id+'"]');const model=await (await response).json();assert.equal(model.wires.length,8);
   assert.equal(await page.$eval('#candidate-list [data-id="'+c.id+'"]',e=>e.getAttribute('aria-pressed')),'true');
   for(const mode of ['differential','common','combined']){await page.click('[data-mode="'+mode+'"]');for(let ch=0;ch<4;ch++){
    await page.click('#channel-bar button:nth-child('+(ch+1)+')');for(const i of [0,90,190]){
     await page.$eval('#frequency',(e,i)=>{e.value=i;e.dispatchEvent(new Event('input',{bubbles:true}));},i);
     assert.equal(await page.$eval('#selected-value',e=>e.textContent),c.curve12ns[mode+'_mVperV'][ch][i].toFixed(3)+' mV/V');count++;
    }
   }}
   assert.equal(await page.evaluate(async url=>(await fetch(url)).status,origin+'reports/porta-test-01/'+c.record),200);
  }
  await page.click('[data-mode="differential"]');await page.$eval('#frequency',e=>{e.value=90;e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.$eval('.structure-grid',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:path.join(qa,'topology-desktop.png')});
  await page.click('#show-fanout');await page.click('#show-fanout');await page.focus('#model-stage');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Home');
  for(const slug of ['porta-test-results','porta-test-00','porta-test-01']){
   await page.setViewport({width:390,height:844});await go(slug);
   if(slug==='porta-test-00')await page.waitForFunction(()=>window.__test00?.ready);
   if(slug==='porta-test-results')await page.waitForFunction(()=>window.__testResults?.ready);
   if(slug==='porta-test-01')await page.waitForSelector('#model-stage canvas');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),slug+' mobile overflow');
   await page.screenshot({path:path.join(qa,slug+'-mobile.png')});
   await page.goto(origin,{waitUntil:'networkidle0'});
   await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('a[href="reports/'+slug+'/"]')]);
   await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('header>a:first-child')]);assert.equal(page.url(),origin);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log(JSON.stringify({passed:true,topologyValuesChecked:count,errors,bad}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
