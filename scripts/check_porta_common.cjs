const puppeteer=require('puppeteer'),assert=require('assert'),fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage(),errors=[],bad=[],qa=path.resolve('.codex-artifacts/porta-common-qa');fs.mkdirSync(qa,{recursive:true});
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)bad.push(r.status()+' '+r.url());});
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.setViewport({width:1440,height:1100});
 const origin=(process.env.ATLAS_ORIGIN||'http://127.0.0.1:8000').replace(/\/$/,'')+'/',url=origin+'reports/porta-test-02/';
 try{
  await page.goto(url,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__common?.ready&&window.__test02Progress&&window.__test02MeshProgress);assert((await page.$eval('#mesh-check-progress',e=>e.textContent)).includes('시간·격자 검토 완료'));
  await (await page.$('#comparison')).screenshot({path:'reports/porta-test-02/cover.png'});
  console.log(execFileSync('python',['scripts/validate.py'],{encoding:'utf8'}).trim());
  const data=JSON.parse(fs.readFileSync('reports/porta-test-02/records/common-14/manifest.json','utf8')),state=()=>page.evaluate(()=>__common.snapshot());
  const drive=JSON.parse(fs.readFileSync('reports/porta-test-02/records/common-14/drive-reference.json','utf8'));
  const time=JSON.parse(fs.readFileSync('reports/porta-test-02/records/time-18/time-review.json','utf8'));
  const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await page.$$eval('#case-select option',es=>es.length),data.cases.length);
  assert.equal(await page.$eval('#case-select',e=>e.disabled),data.cases.length<2);
  assert.equal(await page.$eval('#compare-select',e=>e.disabled),data.cases.length<2);
  let checked=0,inputChecked=0,comparisonChecked=0,currentChecked=0,driveChecked=0,timeChecked=0;
  for(let ci=0;ci<data.cases.length;ci++){
   const c=data.cases[ci];await page.select('#case-select',String(ci));await page.waitForFunction(id=>__common.snapshot().modelId===id,{},c.id);
   assert.equal((await state()).wireCount,8);assert.equal((await state()).sourceCount,2);assert.equal((await state()).bondCount,c.input.shieldBonds.length);
   const otherIndex=data.cases.length>1?(ci+1)%data.cases.length:null;
   if(otherIndex!==null)await page.select('#compare-select',String(otherIndex));
   for(const w of Object.keys(c.windows)){
    await page.select('#window-select',w);
    for(const mode of['diff','common']){
     await page.click('#mode-'+mode);
     for(let ch=0;ch<4;ch++){
      await page.click('#channel-buttons button:nth-child('+(ch+1)+')');
      for(const i of[0,90,190]){
       await page.$eval('#frequency',(e,i)=>{e.value=i;e.dispatchEvent(new Event('input',{bubbles:true}));},i);
       const key=(mode==='diff'?'Hdiff':'Hcommon')+(ch<2?'Near':''),z=c.windows[w][key],v=Math.hypot(z.real[ch%2][i],z.imag[ch%2][i]);
       assert(Math.abs((await state()).value-v)<1e-12);assert.equal(await page.$eval('#coupling-value',e=>e.textContent),(v*(mode==='diff'?1000:1)).toFixed(3)+(mode==='diff'?' mV':' V'));checked++;
       if(otherIndex!==null){const q=data.cases[otherIndex].windows[w][key],otherValue=Math.hypot(q.real[ch%2][i],q.imag[ch%2][i]);assert(Math.abs((await state()).comparisonValue-otherValue)<1e-12);assert((await page.$eval('#comparison-value',e=>e.textContent)).includes((otherValue*(mode==='diff'?1000:1)).toFixed(3)+(mode==='diff'?' mV':' V')));comparisonChecked++;}
       if(mode==='common'&&ch===0){const q=c.windows[w].HshieldCurrent;for(let bi=0;bi<c.input.shieldBonds.length;bi++){const current=Math.hypot(q.real[bi][i],q.imag[bi][i])*1000;assert((await page.$eval('#bond-values',e=>e.textContent)).includes(current.toFixed(3)+' mA'));currentChecked++;}}
       for(const[key,id,snapshot]of[['inputDM_over_CM','input-residual','inputResidual'],['inputBusDM_over_CM','input-bus-residual','busResidual']]){
        const q=c.windows[w][key],x=Math.hypot(q.real[i],q.imag[i]);assert(Math.abs((await state())[snapshot]-x)<1e-13);assert.equal(await page.$eval('#'+id,e=>e.textContent),(x*100).toFixed(3)+'%');inputChecked++;
       }
      }
     }
    }
   }
   assert.equal(await page.$eval('#input-peak',e=>e.textContent),(c.inputDiagnostics.peakCommonInput_V*1000).toFixed(3)+' mV');
   await page.select('#reference-select','drive');
   for(const w of Object.keys(c.windows)){
    await page.select('#window-select',w);
    for(const mode of['diff','common']){await page.click('#mode-'+mode);
     for(let ch=0;ch<4;ch++){await page.click('#channel-buttons button:nth-child('+(ch+1)+')');
      for(const i of[90,163,190]){
       await page.$eval('#frequency',(e,i)=>{e.value=i;e.dispatchEvent(new Event('input',{bubbles:true}));},i);
       const key=(mode==='diff'?'Hdiff':'Hcommon')+(ch<2?'Near':''),z=drive.cases[c.id].windows[w][key],v=Math.hypot(z.real[ch%2][i],z.imag[ch%2][i]);
       assert.equal((await state()).reference,'drive');assert(Math.abs((await state()).value-v)<1e-12);assert.equal(await page.$eval('#coupling-value',e=>e.textContent),(v*(mode==='diff'?1000:1)).toFixed(3)+(mode==='diff'?' mV':' V'));driveChecked++;
       if(otherIndex!==null){const z=drive.cases[data.cases[otherIndex].id].windows[w][key];assert(Math.abs((await state()).comparisonValue-Math.hypot(z.real[ch%2][i],z.imag[ch%2][i]))<1e-12);}
       if(mode==='common'&&ch===0){const f=drive.cases[c.id].windows[w].VinOverDrive,mult=Math.hypot(f.real[i],f.imag[i]);for(let bi=0;bi<c.input.shieldBonds.length;bi++){const q=c.windows[w].HshieldCurrent,v=Math.hypot(q.real[bi][i],q.imag[bi][i])*mult*1000;assert((await page.$eval('#bond-values',e=>e.textContent)).includes(v.toFixed(3)+' mA'));}}
      }
     }
    }
   }
   await page.select('#reference-select','loaded');
  }
  await page.click('#compare-both');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-both');assert.equal((await state()).bondCount,2);assert.equal((await state()).other,'1');assert.equal((await state()).reference,'loaded');
  await page.$eval('#inspect-peak',e=>{let p=e;while(p){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}});await page.click('#inspect-peak');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-near');assert.equal((await state()).index,163);assert.equal((await state()).reference,'drive');assert(Math.abs((await state()).value-.5154971312832425)<1e-12);await page.select('#reference-select','loaded');assert(Math.abs((await state()).value-7.139963281336486)<1e-12);await page.$$eval('.acceptance-note details',es=>es.forEach(e=>e.open=false));
  for(const mode of['common','diff']){await page.click('#compare-'+mode);await page.waitForFunction(()=>__common.snapshot().modelId==='test02-near');const s=await state();assert.equal(s.mode,mode);assert.equal(s.channel,1);assert.equal(s.index,90);assert.equal(s.windowKey,'12');assert.equal(s.other,'0');}
  await page.click('#compare-common');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-near');
  const meshData=JSON.parse(fs.readFileSync('reports/porta-test-02/records/mesh-20/manifest.json','utf8')),meshDrive=JSON.parse(fs.readFileSync('reports/porta-test-02/records/mesh-20/drive-reference.json','utf8'));let meshChecked=0,meshTableChecked=0;
  await page.click('#review-mesh');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-near-fine');assert.equal((await state()).reviewMode,'mesh');assert((await page.$eval('#case-select',e=>e.selectedOptions[0].textContent)).includes('0.16 mm'));
  for(let ci=0;ci<meshData.cases.length;ci++){
   const c=meshData.cases[ci];await page.select('#case-select',String(ci));await page.waitForFunction(id=>__common.snapshot().modelId===id,{},c.id);assert(Math.abs((await state()).meshCell-c.input.minCell_mm.y)<1e-14);assert.deepEqual((await state()).modelGridLines,c.input.meshLines);
   const oi=c.id==='test02-near-fine'?meshData.cases.findIndex(c=>c.id==='test02-near'):(ci+1)%meshData.cases.length;await page.select('#compare-select',String(oi));
   for(const ref of['loaded','drive']){await page.select('#reference-select',ref);
    for(const w of Object.keys(c.windows)){await page.select('#window-select',w);
     for(const mode of['diff','common']){await page.click('#mode-'+mode);
      for(let ch=0;ch<4;ch++){await page.click('#channel-buttons button:nth-child('+(ch+1)+')');
       for(const i of[0,90,190]){await page.$eval('#frequency',(e,i)=>{e.value=i;e.dispatchEvent(new Event('input',{bubbles:true}));},i);
        const k=(mode==='diff'?'Hdiff':'Hcommon')+(ch<2?'Near':''),v=(ref==='loaded'?c.windows[w]:meshDrive.cases[c.id].windows[w])[k],q=(ref==='loaded'?meshData.cases[oi].windows[w]:meshDrive.cases[meshData.cases[oi].id].windows[w])[k];
        assert(Math.abs((await state()).value-Math.hypot(v.real[ch%2][i],v.imag[ch%2][i]))<1e-12);assert(Math.abs((await state()).comparisonValue-Math.hypot(q.real[ch%2][i],q.imag[ch%2][i]))<1e-12);meshChecked++;
        if(c.id==='test02-near-fine'&&mode==='diff'){
         const table=await page.$$eval('#mesh-values-table tbody tr',es=>es.map(tr=>[...tr.querySelectorAll('td')].map(e=>e.textContent))),near=meshData.cases;
         for(let ri=0;ri<near.length;ri++){const n=near[ri],z=ref==='loaded'?n.windows[w]:meshDrive.cases[n.id].windows[w],suffix=ch<2?'Near':'',cm=z['Hcommon'+suffix],dm=z['Hdiff'+suffix];assert.deepEqual(table[ri],[(n.input.shieldBondCase==='near'?'한쪽':'미접속')+' · '+n.input.minCell_mm.y.toFixed(2)+' mm',Math.hypot(cm.real[ch%2][i],cm.imag[ch%2][i]).toFixed(3)+' V',(1000*Math.hypot(dm.real[ch%2][i],dm.imag[ch%2][i])).toFixed(3)+' mV']);meshTableChecked+=2;}
        }
       }
      }
     }
    }
   }
   await page.$eval('.coupling-detail',e=>e.open=true);for(const id of['case-file','case-csv']){assert((await page.$eval('#'+id,e=>e.getAttribute('href'))).startsWith('records/mesh-20/'));assert.equal(await page.$eval('#'+id,async e=>(await fetch(e.href)).status),200);}await page.$eval('.coupling-detail',e=>e.open=false);
  }
  await page.$eval('#mesh-review',e=>e.open=true);
  for(const mode of['common','diff']){await page.click('#inspect-fine-'+mode);await page.waitForFunction(()=>__common.snapshot().modelId==='test02-near-fine');const ss=await state();assert.equal(ss.mode,mode);assert.equal(ss.reference,'drive');assert.equal(meshData.cases[+ss.other].id,'test02-floating-fine');assert.equal(ss.index,90);assert.equal(ss.windowKey,'12');const key=mode==='common'?'HcommonNear':'HdiffNear',fine=meshDrive.cases['test02-near-fine'].windows['12'][key],floating=meshDrive.cases['test02-floating-fine'].windows['12'][key];assert(Math.abs(ss.value-Math.hypot(fine.real[1][90],fine.imag[1][90]))<1e-12);assert(Math.abs(ss.comparisonValue-Math.hypot(floating.real[1][90],floating.imag[1][90]))<1e-12);}
  await page.click('#inspect-floating-mesh');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-floating-fine');assert.equal((await state()).bondCount,0);assert.equal(meshData.cases[+(await state()).other].id,'test02-floating');await page.$eval('#mesh-review',e=>e.open=false);
  await page.click('#review-mesh');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-near-fine');await page.click('#show-result-mesh');await page.$eval('.stage-wrap',e=>e.scrollIntoView({behavior:'instant',block:'center'}));await frames();await page.screenshot({path:path.join(qa,'fine-mesh.png')});await page.click('#show-result-mesh');
  await page.$eval('#mesh-review',e=>e.open=true);await page.$eval('#mesh-review',e=>e.scrollIntoView({behavior:'instant',block:'center'}));await frames();await page.screenshot({path:path.join(qa,'mesh-review.png')});await page.$eval('#mesh-review',e=>e.open=false);
  await page.click('#review-shield');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-both');assert.equal((await state()).reviewMode,'shield');assert.equal(await page.$$eval('#case-select option',es=>es.length),3);
  await page.$eval('#long-time-review',e=>e.open=true);await page.click('#inspect-time');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-near');assert.equal((await state()).reference,'drive');assert.equal(time.snapshotOfRunningSolve,false);assert.equal(time.completedRun.solverRun,true);assert.equal(time.snapshotCutoff_ns,24);
  for(const ref of['loaded','drive']){await page.select('#reference-select',ref);
   for(let ch=0;ch<4;ch++){await page.click('#channel-buttons button:nth-child('+(ch+1)+')');
    for(const i of[90,163,190]){
     await page.$eval('#frequency',(e,i)=>{e.value=i;e.dispatchEvent(new Event('input',{bubbles:true}));},i);
     const rows=await page.$$eval('#time-values-table tbody tr',es=>es.map(tr=>[...tr.querySelectorAll('td')].map(e=>e.textContent)));
     for(const [ri,[ns,w]]of Object.entries(time.windows).entries()){
      const v=ref==='loaded'?w:w.drive,suffix=ch<2?'Near':'',cm=v['Hcommon'+suffix],dm=v['Hdiff'+suffix];
      assert.deepEqual(rows[ri],[ns+' ns',Math.hypot(cm.real[ch%2][i],cm.imag[ch%2][i]).toFixed(3)+' V',(1000*Math.hypot(dm.real[ch%2][i],dm.imag[ch%2][i])).toFixed(3)+' mV']);timeChecked+=2;
     }
    }
   }
  }
  await page.click('#inspect-time');await frames();await page.$eval('#long-time-review',e=>e.scrollIntoView({behavior:'instant',block:'center'}));await frames();await page.screenshot({path:path.join(qa,'completed-time.png')});await page.$eval('#long-time-review',e=>e.open=false);await page.click('#compare-common');
  await page.click('#show-result-mesh');assert((await state()).gridVisible);await page.click('#show-result-shield');assert.equal((await state()).shieldVisible,false);await page.click('#show-result-shield');
  await page.click('#source-closeup');await page.$eval('.stage-wrap',e=>e.scrollIntoView({behavior:'instant',block:'center'}));await frames();const sourceState=await state();assert.equal(sourceState.sourceCount,2);assert(Math.abs(Math.hypot(...sourceState.camera.map((v,i)=>v-sourceState.target[i]))-55/Math.min(sourceState.aspect,1))<1e-7);await page.screenshot({path:path.join(qa,'source-closeup.png')});
  const before=(await state()).camera;await page.focus('#coupling-scene');await page.keyboard.press('ArrowLeft');assert.notDeepEqual((await state()).camera,before);await page.keyboard.press('Home');
  await page.$eval('#input-check details',e=>e.open=true);await page.click('#input-diff');assert.equal((await state()).inputMode,'diff');const diffPath=await page.$eval('#input-chart polyline',e=>e.getAttribute('points'));assert(!diffPath.includes('NaN'));await page.click('#input-common');assert.equal((await state()).inputMode,'common');assert.notEqual(await page.$eval('#input-chart polyline',e=>e.getAttribute('points')),diffPath);
  await page.$eval('.coupling-detail',e=>e.open=true);for(const id of['case-file','case-csv'])assert.equal(await page.$eval('#'+id,async e=>(await fetch(e.href)).status),200);
  await page.click('#mode-common');await page.click('#channel-buttons button:nth-child(4)');await page.$eval('#frequency',e=>{e.value=90;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.select('#window-select','12');
  await page.$eval('.coupling-detail',e=>e.open=false);await page.$eval('#input-check details',e=>e.open=false);await page.evaluate(()=>scrollTo(0,0));await frames();await page.screenshot({path:path.join(qa,'desktop.png')});
  await (await page.$('#comparison')).screenshot({path:'reports/porta-test-02/cover.png'});
  await page.setViewport({width:390,height:844});await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__common?.ready);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(qa,'mobile.png'),fullPage:true});
  await page.$eval('#coupling-scene',e=>e.scrollIntoView({behavior:'instant',block:'center'}));
  await page.click('#source-closeup');const mobileSource=(await state()).target;assert(mobileSource[0]<-20);
  await page.click('#probe-closeup');assert.notDeepEqual((await state()).target,mobileSource);
  await page.click('#model-overview');assert.deepEqual((await state()).target,[0,-5,0]);
  await (await page.$('.stage-wrap')).screenshot({path:path.join(qa,'mobile-scene.png')});
  await page.click('#review-mesh');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-near-fine');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.$eval('.stage-wrap',e=>e.scrollIntoView({behavior:'instant',block:'center'}));await frames();await page.screenshot({path:path.join(qa,'mobile-fine-mesh.png')});await page.click('#review-shield');await page.waitForFunction(()=>__common.snapshot().modelId==='test02-both');
  await page.goto(origin,{waitUntil:'networkidle0'});await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('a[href="reports/porta-test-02/"]')]);await page.waitForFunction(()=>window.__common?.ready);
  await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('header>a:first-child')]);assert.equal(page.url(),origin);
  await page.goto(origin+'reports/porta-test-results/',{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__testResults?.ready);assert.equal(await page.$$eval('a.result-card',es=>es.length),3);await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('a.result-card[href="../porta-test-02/"]')]);await page.waitForFunction(()=>window.__common?.ready);
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log(JSON.stringify({passed:true,outputValuesChecked:checked,inputRatioValuesChecked:inputChecked,comparisonValuesChecked:comparisonChecked,bondCurrentValuesChecked:currentChecked,driveReferenceValuesChecked:driveChecked,completedTimeValuesChecked:timeChecked,meshValuesChecked:meshChecked,meshTableValuesChecked:meshTableChecked,errors,bad,qa}));
 }catch(e){console.error(e,{errors,bad});await page.screenshot({path:path.join(qa,'failure.png')});process.exitCode=1;}finally{await browser.close();}
})();
