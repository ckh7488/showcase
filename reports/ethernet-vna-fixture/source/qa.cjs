const {chromium}=require(process.env.ETHERNET_PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),http=require('http');
const report=path.resolve(__dirname,'..'),root=path.resolve(report,'../..');
const output=process.env.ETHERNET_QA_OUTPUT||path.join(report,'qa');
const expectedPath=process.env.ETHERNET_EXPECTED_CSV;
if(!expectedPath)throw Error('Set ETHERNET_EXPECTED_CSV to the retained predicted-observables.csv');
const lines=fs.readFileSync(expectedPath,'utf8').trim().split(/\r?\n/).map(x=>x.split(','));const headers=lines.shift();
const raw=lines.map(row=>Object.fromEntries(headers.map((key,i)=>[key,Number(row[i])])));
const summary=JSON.parse(fs.readFileSync(path.join(path.dirname(expectedPath),'summary.json')));
const keys={reflection:'open_b_s11',coupling:'open_d_to_c_s21',matched:'matched_a_s11',loopback:'loopback_d_to_c_s21'};
const close=(a,b)=>Math.abs(a-b)<.051;
(async()=>{
 fs.mkdirSync(output,{recursive:true});let server;
 let base=process.env.ETHERNET_PUBLIC_BASE;
 if(!base){server=http.createServer((req,res)=>{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403);return res.end();}if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.existsSync(file)){res.writeHead(404);return res.end();}const type={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'content-type':type});fs.createReadStream(file).pipe(res);});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port+'/';}
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1280,height:950}});const errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.status()+' '+r.url());});
 try{
  await page.goto(new URL('reports/ethernet-vna-fixture/',base).href,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__ethernetPrediction&&document.querySelector('#latest-model canvas'));
  const tested=[];
  for(const [test,key]of Object.entries(keys)){
   await page.locator(`[data-prediction-choose="${test}"]`).click();
   const tile=page.locator(`[data-prediction-choose="${test}"]`);
   const tileValue=Number((await tile.locator('strong').textContent()).replace('dB','').trim().replace('−','-'));
   if(!close(tileValue,summary.samples_mhz['100'][key].db))throw Error('100 MHz summary '+test);
   for(const index of [0,796,1600]){
    await page.locator('[data-prediction-slider]').evaluate((el,index)=>{el.value=index;el.dispatchEvent(new Event('input',{bubbles:true}));},index);
    const state=await page.evaluate(()=>window.__ethernetPrediction.snapshot());
    const shown=Number((await page.locator('[data-prediction-value]').textContent()).replace('−','-'));
    const phase=Number((await page.locator('[data-prediction-phase]').textContent()).replace('위상 ','').replace('°','').replace('−','-'));
    if(state.index!==index||state.selected!==test||!close(shown,raw[index][key+'_db']))throw Error('Selected raw value '+test+' '+index);
    if(Math.abs(((phase-raw[index][key+'_phase_deg']+540)%360)-180)>.051)throw Error('Raw phase '+test);
    if(Math.abs(state.frequency_mhz-raw[index].frequency_hz/1e6)>1e-8)throw Error('Uncomputed frequency');
    const expectedWarning=test==='coupling'&&index===0;
    if((await page.locator('[data-prediction-window]').isVisible())!==expectedWarning)throw Error('Time-window flag '+test);
   }
   if((await page.locator('[data-prediction-scope]').isVisible())!==(test==='coupling'))throw Error('Coupling scope');
   tested.push(test);
  }
  for(const pair of ['B','C','D','A']){await page.locator(`[data-pair="${pair}"]`).click();if(!(await page.locator('#pairSummary').textContent()).includes('페어 '+pair))throw Error('Pair explorer '+pair);}
  await page.locator('#layer').selectOption('B.Cu');await page.locator('#layer').selectOption('all');await page.locator('#zoomBoard').click();await page.locator('#zoomBoard').click();
  const widths=[];
  for(const width of [1280,896,390,320]){
   await page.setViewportSize({width,height:950});
   for(const test of Object.keys(keys)){await page.locator(`[data-prediction-choose="${test}"]`).click();if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Overflow '+width+' '+test);}
   widths.push(width);
  }
  await page.locator('[data-prediction-choose="reflection"]').click();await page.locator('[data-prediction-slider]').evaluate(el=>{el.value=796;el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.setViewportSize({width:1280,height:950});
  await page.locator('#simulation').screenshot({path:path.join(output,'openems-desktop.png')});
  await page.screenshot({path:path.join(output,'full-desktop.png'),fullPage:true});
  await page.locator('#latest-spread').click();await page.locator('#latest-model').focus();
  const before=await page.locator('#latest-model .model-label').first().getAttribute('style');await page.keyboard.press('ArrowLeft');const after=await page.locator('#latest-model .model-label').first().getAttribute('style');
  if(before===after)throw Error('3D keyboard orbit');await page.keyboard.press('Home');await page.locator('#latest-spread').click();
  await page.setViewportSize({width:320,height:950});await page.locator('#simulation').screenshot({path:path.join(output,'openems-mobile.png')});
  await page.locator('.model-details summary').click();if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1))throw Error('Expanded settings overflow');
  await page.locator('.model-details summary').click();
  if(process.env.ETHERNET_WRITE_COVER==='1'){
   await page.setViewportSize({width:1280,height:950});
   const style=await page.addStyleTag({content:'#simulation{display:grid;grid-template-columns:1.7fr 1fr;grid-template-rows:auto 1fr;gap:16px 22px;height:650px}#simulation>.test-heading{grid-column:1/-1}#simulation>.section-lead,#simulation>.latest-caption,#simulation>.prediction-summary-heading,#simulation>.predicted-response,#simulation>.model-details,#simulation .latest-model-blocks,#simulation .latest-model-tools{display:none}#simulation .latest-model-grid{display:contents}#simulation .latest-model-grid>div{grid-column:1;grid-row:2}#simulation .prediction-summary{grid-column:2;grid-row:2;grid-template-columns:1fr 1fr;margin:0}#simulation #latest-model{height:460px}#simulation .prediction-tile>strong{font-size:30px}'});
   await page.waitForTimeout(150);await page.locator('#simulation').screenshot({path:path.join(report,'cover.png')});await style.evaluate(el=>el.remove());
  }
  const back=await page.locator('header a').first().getAttribute('href');if(back!=='../../')throw Error('ATLAS back link');
  await page.goto(base,{waitUntil:'networkidle'});
  const entry=page.locator('a[href*="reports/ethernet-vna-fixture"]').first();await entry.waitFor();await entry.click();await page.waitForFunction(()=>window.__ethernetPrediction);
  if(errors.length||missing.length)throw Error(JSON.stringify({errors,missing}));
  const result={four_tests:tested,raw_indices:[0,796,1600],summary_100mhz:'passed',stored_frequency_selection:'passed',widths,original_board_controls:'passed',model_controls:'passed',catalog_navigation:'passed',errors,missing};
  fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
