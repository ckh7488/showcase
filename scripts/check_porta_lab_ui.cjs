const puppeteer=require('puppeteer'),fs=require('fs'),path=require('path'),assert=require('assert');
const origin=(process.env.ATLAS_ORIGIN||'http://127.0.0.1:8000').replace(/\/$/,'')+'/';
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/porta-lab-setup'),qa=path.join(require('os').tmpdir(),'atlas-porta-lab-qa');fs.mkdirSync(qa,{recursive:true});
(async()=>{
 const browser=await puppeteer.launch({headless:true,args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const page=await browser.newPage();await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await page.setViewport({width:1600,height:1100,deviceScaleFactor:1});
 const errors=[],bad=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
 try{
 await page.goto(origin+'reports/porta-lab-setup/',{waitUntil:'networkidle0'});
 try{await page.waitForFunction(()=>window.__labSetup?.ready&&window.__labRoom?.ready&&window.__pcbViewer?.ready,{timeout:45000});}catch(e){console.log(await page.evaluate(()=>({room:document.getElementById('room-error').textContent,pcb:document.getElementById('viewer-error').textContent})));throw e;}
 console.log('Ready',await page.evaluate(()=>({map:__labSetup.snapshot(),room:__labRoom.snapshot(),pcb:__pcbViewer.snapshot()})));
 await page.screenshot({path:path.join(qa,'desktop.png'),fullPage:false});
 await page.click('[data-focus="porta"]');assert.equal(await page.$eval('[data-focus="porta"]',e=>e.getAttribute('aria-pressed')),'true');
 await page.$eval('[data-node="coupler"]',e=>{e.scrollIntoView({block:'center',inline:'center',behavior:'instant'});e.focus();});await page.keyboard.press('Enter');assert((await page.$eval('#node-title',e=>e.textContent)).includes('암–암'));
 await page.select('#review-status','correct');await page.type('#review-note','UI verification note');
 assert.equal((await page.evaluate(()=>__labSetup.snapshot())).reviews.coupler.status,'correct');
 await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__labRoom?.ready&&window.__pcbViewer?.ready);assert.equal((await page.evaluate(()=>__labSetup.snapshot())).reviews.coupler.note,'UI verification note');
 await page.evaluate(()=>localStorage.removeItem('atlas-porta-lab-review-01'));await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__labRoom?.ready&&window.__pcbViewer?.ready);
 await page.click('[data-focus="noise"]');await page.click('#show-noise');assert(await page.$eval('[data-edge="noise1"]',e=>e.classList.contains('hidden-mark')));await page.click('#show-noise');await page.click('[data-focus="all"]');
 // Every node must have a legible title and a working inspector; check SVG title bounds.
 const bounds=await page.evaluate(()=>[...document.querySelectorAll('.node')].flatMap(g=>{const r=g.querySelector('rect');return [...g.querySelectorAll('text')].filter(t=>t.getBBox().x+t.getBBox().width>Number(r.getAttribute('width'))-4).map(t=>({id:g.dataset.node,text:t.textContent,width:t.getBBox().width,box:r.getAttribute('width')}));}));console.log('Label overflow',bounds);
 const topology=await page.evaluate(()=>__labRoom.snapshot());assert.equal(topology.compositeCable,true);assert.deepEqual(topology.pairs,['Ethernet 1','Ethernet 2','+24V/+24V','0V/0V']);assert.deepEqual(topology.shieldEndBonds,[false,false]);assert.equal(topology.sensorAndSmpsOnSteelTable,true);
 for(const view of ['room','breakout','inside','boards','sensor']){await page.click(`[data-room="${view}"]`);assert.equal((await page.evaluate(()=>__labRoom.snapshot())).view,view);await page.$eval('#room-wrap',e=>e.scrollIntoView({block:'center'}));await new Promise(r=>setTimeout(r,350));await (await page.$('#room-wrap')).screenshot({path:path.join(qa,`3d-${view}.png`)});}
 await page.click('[data-room="inside"]');await page.$eval('#room-explode',e=>{e.value='60';e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal((await page.evaluate(()=>__labRoom.snapshot())).explode,60);
 await page.$eval('#room-explode',e=>{e.value='0';e.dispatchEvent(new Event('input',{bubbles:true}));});
 await page.click('#segment-phy');await page.click('[data-pair="rx"]');assert.equal((await page.evaluate(()=>__pcbViewer.snapshot())).segment,'phy');assert.equal((await page.evaluate(()=>__pcbViewer.snapshot())).pair,'rx');
 await page.click('#segment-cable');await page.click('[data-pair="tx"]');await page.click('#explode');assert.equal((await page.evaluate(()=>__pcbViewer.snapshot())).separated,true);await page.click('#inner-toggle');await page.select('#ground-mode','all');assert.equal((await page.evaluate(()=>__pcbViewer.snapshot())).groundTotal,568);await (await page.$('#scene')).screenshot({path:path.join(qa,'pcb.png')});
 await page.click('#explode');await page.click('[data-pair="both"]');await page.select('#ground-mode','near');await page.click('#inner-toggle');
 await page.focus('#scene');const before=await page.evaluate(()=>__pcbViewer.snapshot().camera);await page.keyboard.press('ArrowLeft');const after=await page.evaluate(()=>__pcbViewer.snapshot().camera);assert.notDeepEqual(before,after);
 // Full-resolution diagram capture and portable SVG; no computed results are introduced.
 await page.setViewport({width:1760,height:1250});
 await page.evaluate(()=>{document.getElementById('map-reset').click();const s=document.getElementById('system-map');s.style.width='1680px';s.style.minWidth='1680px';const w=document.getElementById('map-scroll');w.style.maxHeight='none';w.style.overflow='visible';w.style.width='1680px';document.querySelector('.map-layout').style.display='block';document.getElementById('inspector').style.display='none';});
 await (await page.$('#system-map')).screenshot({path:path.join(out,'connection-map.png')});
 await (await page.$('#system-map')).screenshot({path:path.join(out,'cover.png')});
 const serialized=await page.evaluate(()=>{const s=document.getElementById('system-map'),c=s.cloneNode(true),a=[s,...s.querySelectorAll('*')],b=[c,...c.querySelectorAll('*')],props=['fill','stroke','stroke-width','stroke-dasharray','stroke-linejoin','font-family','font-size','font-weight','letter-spacing','opacity','display','paint-order'];a.forEach((x,i)=>{const cs=getComputedStyle(x);b[i].setAttribute('style',props.map(p=>`${p}:${cs.getPropertyValue(p)}`).join(';'));});c.setAttribute('width','1680');c.setAttribute('height','1110');c.setAttribute('style','background:white');return new XMLSerializer().serializeToString(c);});fs.writeFileSync(path.join(out,'connection-map.svg'),serialized);
 await page.setViewport({width:390,height:844});await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.__labRoom?.ready&&window.__pcbViewer?.ready);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile page overflow');await page.screenshot({path:path.join(qa,'mobile.png')});await page.$eval('#room-wrap',e=>e.scrollIntoView({block:'center'}));await (await page.$('#room-wrap')).screenshot({path:path.join(qa,'mobile-3d.png')});
 // Landing card → report → back, without relying on a direct-only URL.
 await page.goto(origin,{waitUntil:'networkidle0'});await page.waitForSelector('a[href="reports/porta-lab-setup/"]');await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('a[href="reports/porta-lab-setup/"]')]);assert(page.url().includes('/porta-lab-setup/'));await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),page.click('.topbar>a')]);assert.equal(page.url(),origin);
 const report={pageErrors:errors,badResponses:bad,labelOverflows:bounds,checked:'Map selection, route filters, notes persistence, 4 room views, explode, PCB segments/pairs/ground/inner copper, keyboard rotation, mobile overflow, landing/report/back',runtime_ready:true};fs.writeFileSync(path.join(qa,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));assert.equal(errors.length,0);assert.equal(bad.length,0);assert.equal(bounds.length,0);
 }catch(e){console.error('UI failure',e);console.error({errors,bad});await page.screenshot({path:path.join(qa,'failure.png'),fullPage:false});process.exitCode=1;}finally{await browser.close();}
})();
