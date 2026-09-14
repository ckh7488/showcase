const puppeteer=require('puppeteer'),fs=require('fs'),path=require('path'),assert=require('assert');
const qa=path.join(require('os').tmpdir(),'atlas-porta-test-qa');fs.mkdirSync(qa,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage(),errors=[],bad=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
 const snapshot=()=>page.evaluate(()=>__connectionReview.snapshot());
 try{
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.setViewport({width:1450,height:1050});
  await page.goto('http://127.0.0.1:8000/reports/porta-test-plan/verification-history.html',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.__connectionReview?.ready);
  assert.equal(await page.$eval('#initial-records',e=>e.open),false);
  for(const level of ['coarse','fine']){
   await page.click('#pec-'+level);
   for(let wire=0;wire<8;wire++){
    await page.select('#pec-wire',String(wire));const s=await snapshot();assert.equal(s.connected,level==='fine'||wire<4);assert(s.shownEdges>0);assert.equal(s.solverLaunchedInBrowser,false);assert.equal(s.replacementTransientComplete,false);
   }
  }
  await page.select('#pec-wire','4');await page.click('#pec-coarse');await page.click('#pec-close');
  await page.$eval('#pec-scene',e=>e.scrollIntoView({block:'center',behavior:'instant'}));
  await (await page.$('#pec-scene')).screenshot({path:path.join(qa,'connection-coarse-close.png')});
  await page.click('#pec-fine');await page.click('#pec-close');await (await page.$('#pec-scene')).screenshot({path:path.join(qa,'connection-fine-close.png')});
  await page.click('#pec-cad');assert.equal((await snapshot()).cad,false);await page.click('#pec-cad');
  await page.focus('#pec-scene');const before=(await snapshot()).camera;await page.keyboard.press('ArrowLeft');assert.notDeepEqual(before,(await snapshot()).camera);await page.keyboard.press('Home');
  for(const selector of ['#pec-native','#pec-audit'])assert.equal(await page.$eval(selector,async e=>(await fetch(e.href)).status),200);
  await page.$eval('#ref-comparison',e=>{e.open=true;});assert.equal(await page.$$eval('#ref-chart polyline',a=>a.length),2);
  await page.$eval('#initial-records',e=>{e.open=true;});await page.click('#sim-mixed');await page.waitForFunction(()=>__simulationResults.snapshot().wiring==='mixed');
  assert((await page.$eval('#sim-point-validation',e=>e.textContent)).includes('끊어진'));await page.$eval('#initial-records',e=>{e.open=false;});
  await page.click('#pec-coarse');await page.click('#pec-overview');await (await page.$('#run-results')).screenshot({path:path.join(qa,'connection-review-desktop.png')});
  await page.setViewport({width:390,height:844});await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__connectionReview?.ready);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile overflow');
  await page.$eval('#pec-scene',e=>e.scrollIntoView({block:'center',behavior:'instant'}));await page.screenshot({path:path.join(qa,'connection-review-mobile.png')});
  await page.click('#pec-fine');assert.equal((await snapshot()).connected,true);await page.click('#pec-overview');
  await page.click('.topbar>a[href="../../"]');await page.waitForFunction(()=>!location.pathname.includes('/reports/'));
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  const result={passed:true,pageErrors:errors,badResponses:bad,checks:'Native connectivity for 8 wires on both grids; no new transient claim; wire selection, CAD toggle, keyboard, zoom, evidence links, archived old controls, reference curves, mobile, landing and back'};
  fs.writeFileSync(path.join(qa,'connection-review-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(e){console.error(e,{errors,bad});await page.screenshot({path:path.join(qa,'connection-review-failure.png')});process.exitCode=1;}finally{await browser.close();}
})();
