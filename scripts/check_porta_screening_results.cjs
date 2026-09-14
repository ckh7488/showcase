/* Verify the saved-result UI against the actual manifest, never dummy values. */
const puppeteer=require('puppeteer'),fs=require('fs'),path=require('path'),assert=require('assert');
const qa=path.join(require('os').tmpdir(),'atlas-porta-test-qa');fs.mkdirSync(qa,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage(),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 const state=()=>page.evaluate(()=>__simulationResults.snapshot());
 try{
  await page.setViewport({width:1500,height:1100,deviceScaleFactor:1});
  await page.goto('http://127.0.0.1:8000/reports/porta-test-plan/?run=06#run-results',{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.__simulationResults?.ready);
  let s=await state();assert.equal(s.wireCount,8);assert.equal(s.portCount,6);assert.equal(s.solverLaunchedInBrowser,false);
  const hasMixed=await page.evaluate(()=>__simulationResults.data.completedComparisons.coarseAB);
  for(const w of hasMixed?['same','mixed']:['same']){
   await page.click('#sim-'+w);await page.waitForFunction(w=>__simulationResults.snapshot().geometryCaseId.includes('-'+w+'-'),{},w);
   for(const pair of [0,1]){
    await page.click('#sim-pair'+pair);
    for(const index of [0,90,190]){
     await page.$eval('#sim-frequency',(e,index)=>{e.value=index;e.dispatchEvent(new Event('input',{bubbles:true}));},index);
     assert.equal((await state()).frequency_Hz,(10+index)*1e6);
     const check=await page.evaluate(({w,pair,index})=>{const s=__simulationResults.snapshot(),r=__simulationResults.data.cableRuns.find(r=>r.id===`test01-${w}-${s.level}`).windows[s.windowNs],v=Math.hypot(r.Hdiff.real[pair][index],r.Hdiff.imag[pair][index]);return{db:document.getElementById('sim-db-'+w).textContent,expected:(20*Math.log10(Math.max(v,1e-15))).toFixed(2)};},{w,pair,index});
     assert(check.db.startsWith(check.expected+' dB'));
    }
   }
   await page.click('#sim-common');assert.equal((await state()).mode,'common');
   const cm=await page.evaluate(w=>{const s=__simulationResults.snapshot(),r=__simulationResults.data.cableRuns.find(r=>r.id===s.caseId).windows[s.windowNs],v=Math.hypot(r.Hcommon.real[s.pair][s.index],r.Hcommon.imag[s.pair][s.index]);return{actual:document.getElementById('sim-db-'+w).textContent,expected:(20*Math.log10(Math.max(v,1e-15))).toFixed(2)};},w);
   assert(cm.actual.startsWith(cm.expected+' dB'));assert((await page.$eval('#sim-chart-caption',e=>e.textContent)).includes('공통모드'));
   assert((await page.$eval('#sim-point-validation',e=>e.textContent)).includes('격자 비교'));
   await page.click('#sim-diff');assert.equal((await state()).mode,'diff');
  }
  for(const level of ['coarse','fine']){
   await page.select('#sim-level',level);
   await page.waitForFunction(level=>__simulationResults.snapshot().geometryCaseId.endsWith('-'+level),{},level);
   for(const ns of ['8','12','15.5']){
    await page.select('#sim-window',ns);
    const check=await page.evaluate(()=>{const s=__simulationResults.snapshot(),r=__simulationResults.data.cableRuns.find(r=>r.id===s.caseId).windows[s.windowNs],v=Math.hypot(r.Hdiff.real[s.pair][s.index],r.Hdiff.imag[s.pair][s.index]);return{actual:document.getElementById('sim-db-'+s.wiring).textContent,expected:(20*Math.log10(Math.max(v,1e-15))).toFixed(2)};});
    assert(check.actual.startsWith(check.expected+' dB'));
   }
  }
  assert.equal(await page.$eval('#sim-chart',e=>e.querySelectorAll('polyline').length),4);
  await page.click('#sim-compare-grid');
  await page.select('#sim-end','near');
  await page.waitForFunction(()=>document.querySelector('#sim-labels [data-role="probe"]').textContent.includes('입력 쪽'));
  const nearCheck=await page.evaluate(()=>{const s=__simulationResults.snapshot(),r=__simulationResults.data.cableRuns.find(r=>r.id===s.caseId).windows[s.windowNs],v=Math.hypot(r.HdiffNear.real[s.pair][s.index],r.HdiffNear.imag[s.pair][s.index]);return{actual:document.getElementById('sim-db-'+s.wiring).textContent,expected:(20*Math.log10(Math.max(v,1e-15))).toFixed(2)};});
  assert(nearCheck.actual.startsWith(nearCheck.expected+' dB'));
  await page.select('#sim-end','far');
  await page.waitForFunction(()=>document.querySelector('#sim-labels [data-role="probe"]').textContent.includes('반대쪽'));
  await page.click('#sim-largest');
  const largest=await page.evaluate(()=>{const s=__simulationResults.snapshot(),r=__simulationResults.data.cableRuns.find(r=>r.id===s.caseId).windows[s.windowNs],v=[];for(const end of ['near','far'])for(const pair of [0,1]){const key='Hdiff'+(end==='near'?'Near':'');v.push({end,pair,value:Math.hypot(r[key].real[pair][s.index],r[key].imag[pair][s.index])});}v.sort((a,b)=>b.value-a.value);return{expected:[v[0].end,v[0].pair],actual:[s.observationEnd,s.pair]};});
  assert.deepEqual(largest.actual,largest.expected);
  await page.select('#sim-end','far');
  assert.equal(await page.$eval('#sim-chart',e=>e.querySelectorAll('polyline').length),2);
  await page.click('#sim-compare-grid');
  await page.click('#sim-shield');assert.equal((await state()).shield,false);await page.click('#sim-mesh');assert.equal((await state()).mesh,true);
  await page.click('#sim-input');const input=(await state()).target;await page.click('#sim-output');assert.notDeepEqual((await state()).target,input);
  await page.focus('#sim-scene');const cam=(await state()).camera;await page.keyboard.press('ArrowLeft');assert.notDeepEqual((await state()).camera,cam);await page.keyboard.press('Home');
  await page.click('#sim-same');await page.click('#sim-pair0');await page.click('#sim-shield');await page.click('#sim-mesh');
  await page.$eval('#sim-frequency',e=>{e.value=90;e.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.$eval('#run-results',e=>e.scrollIntoView({behavior:'instant',block:'start'}));
  assert(await page.$eval('#sim-energy',e=>e.querySelectorAll('polyline').length>0),'Missing actual energy trace');
  await (await page.$('#run-results')).screenshot({path:path.join(qa,'simulation-desktop.png')});
  await page.click('#sim-common');await page.$eval('#sim-scene',e=>e.scrollIntoView({behavior:'instant',block:'center'}));await (await page.$('#sim-scene')).screenshot({path:path.join(qa,'simulation-common-paths.png')});await page.click('#sim-diff');
  await page.$eval('#sim-energy',e=>{e.closest('details').open=true;e.scrollIntoView({behavior:'instant',block:'center'});});await (await page.$('#sim-energy')).screenshot({path:path.join(qa,'simulation-energy.png')});
  for(const selector of ['#sim-csv','#sim-input-record']){const status=await page.$eval(selector,async e=>(await fetch(e.href)).status);assert.equal(status,200);}
  await page.setViewport({width:390,height:844});await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__simulationResults?.ready);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile horizontal overflow');
  await page.$eval('#sim-scene',e=>e.scrollIntoView({behavior:'instant',block:'center'}));await page.screenshot({path:path.join(qa,'simulation-mobile.png')});
  await page.click('#sim-input');await page.click('#sim-overview');
  await page.waitForFunction(()=>[...document.querySelectorAll('#sim-labels button')].every(e=>{const r=e.getBoundingClientRect(),b=document.getElementById('sim-scene').getBoundingClientRect();return !e.hidden&&r.left>=b.left&&r.right<=b.right+1;}),{timeout:5000});
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  const result={passed:true,pageErrors:errors,badResponses:bad,hasMixed,checks:'Actual manifest values, both pairs, sampled frequencies, geometry, shield display, real mesh slice, focus, keyboard, evidence links, mobile layout'};
  fs.writeFileSync(path.join(qa,'simulation-verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(e){console.error(e,{errors,bad});await page.screenshot({path:path.join(qa,'simulation-failure.png')});process.exitCode=1;}finally{await browser.close();}
})();
