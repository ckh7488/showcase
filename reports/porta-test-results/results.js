/* Read saved batch state. A completed calculation is not a reviewed result. */
(()=>{
 const $=id=>document.getElementById(id);
 async function update(){
  try{
   const r=await fetch('data/connected-progress.json',{cache:'no-store'});if(!r.ok)throw Error('status');
   const data=await r.json(),rows=data.rows||[],common=data.commonMode||[];
   const complete=rows.length>0&&rows.every(r=>r.stage==='complete');
   const text=$('test01-state').dataset.reviewSummary||'해석 준비 중';
   const remaining=complete?'세분화 계산 확보 · 최종 검토 전':rows.some(r=>['error','on_hold'].includes(r.stage))?'추가 계산 검토 중':'세분화 격자 확인 중';
   $('test01-state').textContent=text;
   $('overall-status').textContent='TEST 00 기준 검사 완료 · TEST 01 '+text+($('test01-state').dataset.reviewComplete==='true'?'':' · '+remaining);
   const running=common.filter(r=>['preparing','fields'].includes(r.stage)).length;
   $('test02-state').textContent=$('test02-state').dataset.reviewSummary||(common.length&&common.every(r=>r.stage==='complete')?'계산 기록 확보 · 해석 전':common.some(r=>r.stage==='error')?'계산 검토 중':running>1?running+'조건 동시 계산':running===1?'1조건 계산 중':common.some(r=>r.stage==='complete')?'일부 계산 확보':'계산 대기');
   $('saved-at').textContent='마지막 실행 상태 저장 · '+new Date(data.updatedAtUTC).toLocaleString('ko-KR')+' · 계산 완료와 결과 해석 완료는 구분합니다.';
   window.__testResults={ready:true,data};
  }catch(e){$('saved-at').textContent='실행 상태를 불러오지 못했습니다. TEST 01 결과서의 저장 기록을 확인하세요.';}
 }
 update();setInterval(update,30000);
})();
