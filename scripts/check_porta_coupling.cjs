const puppeteer=require('puppeteer'),assert=require('assert'),fs=require('fs'),path=require('path');
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage(),errors=[],bad=[],qa=path.resolve('.codex-artifacts/porta-coupling-qa');fs.mkdirSync(qa,{recursive:true});
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.setViewport({width:1440,height:1100});
 try{
  await page.goto('http://127.0.0.1:8000/reports/porta-test-01/',{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__coupling?.ready);
  const data=JSON.parse(fs.readFileSync('reports/porta-test-01/records/connected-10/manifest.json','utf8')),state=()=>page.evaluate(()=>__coupling.snapshot());
  assert.equal((await state()).wireCount,8);
  assert.equal(await page.$$eval('#case-select option',es=>es.length),data.cases.length);
  let checked=0,comparisonChecked=0;
  for(let ci=0;ci<data.cases.length;ci++){
   await page.select('#case-select',String(ci));await page.waitForFunction(id=>__coupling.snapshot().modelId===id,{},data.cases[ci].id);
   const oi=data.cases.findIndex((c,i)=>i!==ci);if(oi>=0)await page.select('#compare-select',String(oi));
   for(const w of Object.keys(data.cases[ci].windows)){
    await page.select('#window-select',w);
    for(const mode of ['diff','common']){
     await page.click('#mode-'+mode);
     for(let ch=0;ch<4;ch++){
      await page.click('#channel-buttons button:nth-child('+(ch+1)+')');
      for(const i of [0,90,190]){
       await page.$eval('#frequency',(e,i)=>{e.value=i;e.dispatchEvent(new Event('input',{bubbles:true}));},i);
       const key=(mode==='diff'?'Hdiff':'Hcommon')+(ch<2?'Near':''),z=data.cases[ci].windows[w][key],v=Math.hypot(z.real[ch%2][i],z.imag[ch%2][i]);
       assert(Math.abs((await state()).value-v)<1e-13);assert.equal(await page.$eval('#coupling-value',e=>e.textContent),(v*1000).toFixed(3)+' mV');checked++;
       if(oi>=0){const r=data.cases[oi].windows[w][key],v2=Math.hypot(r.real[ch%2][i],r.imag[ch%2][i]);assert(Math.abs((await state()).comparisonValue-v2)<1e-13);assert((await page.$eval('#comparison-value',e=>e.textContent)).includes((v2*1000).toFixed(3)+' mV'));comparisonChecked++;}
      }
     }
    }
   }
  }
  await page.click('#show-result-mesh');assert.equal((await state()).gridVisible,true);
  await page.click('#show-result-shield');assert.equal((await state()).shieldVisible,false);await page.click('#show-result-shield');
  await page.click('#probe-closeup');const before=(await state()).camera;await page.focus('#coupling-scene');await page.keyboard.press('ArrowLeft');assert.notDeepEqual((await state()).camera,before);await page.keyboard.press('Home');
  await page.click('#show-mesh-finding');await page.waitForFunction(()=>__coupling.snapshot().modelId==='test01-same-coarse');assert.equal(data.cases[+(await state()).other].id,'test01-same-fine');assert.equal((await state()).index,190);assert.equal((await state()).gridVisible,true);assert.equal(await page.$eval('#coupling-value',e=>e.textContent),'3.616 mV');assert((await page.$eval('#comparison-value',e=>e.textContent)).includes('3.561 mV'));await (await page.$('#comparison')).screenshot({path:path.join(qa,'same-mesh.png')});
  await page.click('#show-mixed-mesh');await page.waitForFunction(()=>__coupling.snapshot().modelId==='test01-mixed-coarse');assert.equal(data.cases[+(await state()).other].id,'test01-mixed-fine');assert.equal(await page.$eval('#coupling-value',e=>e.textContent),'39.480 mV');assert((await page.$eval('#comparison-value',e=>e.textContent)).includes('34.603 mV'));
  await page.click('#channel-buttons button:nth-child(4)');assert.equal(await page.$eval('#channel-judgment',e=>e.hidden),false);
  await page.click('#show-common-finding');await page.waitForFunction(()=>__coupling.snapshot().modelId==='test01-same-fine');assert.equal((await state()).mode,'common');assert.equal((await state()).channel,1);assert((await state()).comparisonValue<(await state()).value);assert.equal(await page.$eval('#channel-judgment',e=>e.hidden),true);
  await page.click('#show-diff-finding');assert.equal((await state()).mode,'diff');assert.equal((await state()).index,90);assert((await state()).comparisonValue>(await state()).value);
  await page.select('#window-select','12');await page.click('#model-overview');await page.evaluate(()=>scrollTo(0,0));
  await new Promise(r=>setTimeout(r,150));await page.screenshot({path:path.join(qa,'desktop.png')});await (await page.$('#comparison')).screenshot({path:'reports/porta-test-01/cover.png'});
  await page.$eval('.coupling-detail',e=>e.open=true);
  assert.equal(await page.$eval('#case-file',async e=>(await fetch(e.href)).status),200);
  assert.equal(await page.$eval('#case-csv',async e=>(await fetch(e.href)).status),200);
  await page.setViewport({width:390,height:844});await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__coupling?.ready);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(qa,'mobile.png'),fullPage:true});
  assert.equal(await page.$eval('#coupling-error',e=>e.hidden),true);assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  console.log(JSON.stringify({passed:true,sourceValuesChecked:checked,comparisonValuesChecked:comparisonChecked,errors,bad,qa}));
 }catch(e){console.error(e,{errors,bad});await page.screenshot({path:path.join(qa,'failure.png')});process.exitCode=1;}finally{await browser.close();}
})();
