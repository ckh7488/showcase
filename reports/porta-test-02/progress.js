(()=>{
 const $=id=>document.getElementById(id);
 async function update(){
  try{
   const r=await fetch('data/connected-progress.json',{cache:'no-store'});if(!r.ok)throw Error('status');const d=await r.json();$('run-grid').replaceChildren();
   const names={floating:'양끝 미접속',near:'입력 쪽 접속',both:'양쪽 접속'},labels={queued:'계산 대기',on_hold:'검토 대기',preparing:'준비 연산',fields:'시간 계산 중',complete:'계산 기록 확보',error:'검토 필요'};
   for(const row of d.commonMode){const el=document.createElement('div');el.className='run-card';const small=document.createElement('small'),strong=document.createElement('strong'),span=document.createElement('span');small.textContent=names[row.bond];strong.textContent=labels[row.stage]||'미시작';span.textContent=row.time_ns===undefined?'—':'관측 '+row.time_ns.toFixed(2)+' ns';el.append(small,strong,span);$('run-grid').append(el);}
   $('progress-time').textContent='마지막 저장 · '+new Date(d.updatedAtUTC).toLocaleString('ko-KR');window.__test02Progress=d;
  }catch(e){$('progress-time').textContent='상태 갱신을 기다립니다.';}
  try{
   const r=await fetch('data/time-check-progress.json',{cache:'no-store'});if(!r.ok)throw Error('time status');const d=await r.json();
   const label={waiting_for_existing_both:'양쪽 접속의 현재 계산이 끝나면 시작',calculating:'계산 중'+(d.time_ns===undefined?'':' · 현재 '+d.time_ns.toFixed(2)+' ns'),raw_complete:'완료 · 24 ns까지 비교 검토',needs_review:'실행 상태 확인 필요'}[d.stage];
   $('time-check-progress').textContent='추가 관측 · 입력 쪽 접속 '+d.maximumPhysicalTime_ns+' ns: '+label;window.__test02TimeProgress=d;
  }catch(e){$('time-check-progress').textContent='추가 관측 계산의 저장 상태를 기다립니다.';}
  try{
   const r=await fetch('data/mesh-check-progress.json',{cache:'no-store'});if(!r.ok)throw Error('mesh status');const d=await r.json();
   const names={near:'한쪽 접속',floating:'미접속'},label={preparing:'모델 준비',checking_connections:'접속 확인',calculating:'계산 중',raw_complete:($('mesh-check-progress').dataset.reviewComplete==='true'?'완료 · 시간·격자 검토 완료':'계산 기록 확보 · 격자 비교 검토 전'),needs_review:'실행 상태 확인 필요'}[d.stage];
   $('mesh-check-progress').textContent='격자 비교 · 단면 0.20 → 0.16 mm: '+(d.current?names[d.current]+' · ':'')+label+(Number.isFinite(d.time_ns)?' · '+d.time_ns.toFixed(2)+' / 12.5 ns':'')+' · '+d.finished.length+'/2 조건 계산 완료';window.__test02MeshProgress=d;
  }catch(e){$('mesh-check-progress').textContent='격자 비교의 저장 상태를 기다립니다.';}
 }
 update();setInterval(update,30000);
})();
