/* Display the latest saved progress of the finite local batch. */
(async()=>{
 const section=document.createElement('section');section.id='connected-progress';
 section.innerHTML=`<div class="section-head"><div><p class="eyebrow">NEXT STEP · RUN 07</p><h2>지금은 연결을 고친 짧은 케이블부터</h2></div></div><p>순서는 <strong>TEST 01 전원 잡음 → TEST 02 공통모드·실드 접속 → TEST 03 PCB → TEST 04 20 m 링크</strong>입니다. 첫 격자의 연결 오류를 고친 모델에서 전원 입력이 케이블을 타고 전달되는지 확인한 뒤, 배선별 잡음과 시간·격자 영향을 비교합니다.</p><p id="connected-progress-status" class="caution" aria-live="polite">실행 기록을 확인하고 있습니다.</p><p class="small muted">아래는 마지막 저장 시점의 실행 상태입니다. 준비 연산도 실제 계산의 일부이며, 표시된 진행률이 새 잡음 결과의 검증 완료를 뜻하지 않습니다.</p><details><summary>PCB 중복 계산 확인 결과</summary><p>ATLAS의 M12–T2 해석 원본 두 개를 다시 읽고 저장된 수치를 대조했습니다. <strong>100 MHz · TX/RX 두 쌍 · 양끝 차동 포트 4개</strong>의 결과가 이미 있습니다. 두 보드의 Gerber와 근사 접속부를 포함한 이 SI 계산을 반복하지 않습니다.</p><p>PCB 단계에서 추가할 내용은 기존 행렬에 없는 공통모드 입력과 차동 변환, 트랜스 내부 전기 모델 및 실제 실장 부하입니다. 기존 PHY측 초기 결과도 재사용 범위를 구분합니다. <a href="data/pcb-reuse-review.json">원본 행렬·해시·중복 여부 확인 ↗</a> · <a href="../porta-pcb/">기존 PCB 분석 ↗</a></p></details>`;
 document.querySelector('.hero').after(section);
 const common=document.createElement('p');common.id='common-progress-status';common.className='small';section.querySelector('#connected-progress-status').after(common);
 const preparation=document.createElement('details');preparation.innerHTML=`<summary>TEST 02에 실제로 준비한 조건</summary><p>120 mm 케이블과 현재 +/+ · 0/0 배선을 고정합니다. 전원 두 묶음과 아래 기준판 사이의 <strong>50 Ω 소스 두 개를 같은 위상</strong>으로 구동합니다. 실드 접속만 미접속·입력 쪽·양쪽으로 바꿉니다. 입력이 완전히 같게 움직이는지도 실제 전압으로 확인합니다.</p><p>추가하는 실드 접속은 높이 17.6 mm, 폭 2 mm, 두께 0.4 mm의 도체입니다. 이 치수는 비교용 시험 조건이며 실제 접지선의 측정값은 아닙니다. Ethernet 두 쌍은 양끝에 각각 100 Ω 시험 종단을 유지합니다.</p><p>준비 검사는 연결·분리 상태를 확인한 것입니다. 아직 실드 접속의 우열을 나타내는 계산값은 없습니다. <a href="records/common-preflight-07/manifest.json">세 조건의 모델·계산 도체 검사 기록 ↗</a> · <a id="open-common-plan" href="#experiment">입력과 리턴을 3D 시험 계획에서 보기 ↓</a></p>`;section.append(preparation);
 preparation.querySelector('#open-common-plan').addEventListener('click',()=>{
  document.querySelector('#test-tabs [data-test="common"]')?.click();
  for(const [id,value] of [['length',120],['pitch',24],['height',20]]){const input=document.getElementById(id);if(input){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));}}
  document.getElementById('baseline')?.click();
  for(const [id,value] of [['shield','floating'],['cm-cap',0]]){const input=document.getElementById(id);if(input){input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));}}
 });
 async function update(){try{
  const response=await fetch('data/connected-progress.json',{cache:'no-store'});if(!response.ok)throw Error(response.status);
  const data=await response.json();const labels={not_started:'미시작',queued:'순서 대기',on_hold:'검토 대기',preparing:'준비 연산',fields:'시간 계산',complete:'계산 기록 확보',error:'계산 중단 · 검토 필요'};
  document.getElementById('connected-progress-status').textContent=data.rows.map(r=>`${r.wiring==='same'?'현재':'변경'} 배선 · ${r.mesh==='coarse'?'수정 기본':'단면 세분화'} 격자: ${labels[r.stage]}${r.time_ns!==undefined?' ('+r.time_ns.toFixed(2)+' ns)':''}`).join(' / ')+' · 기록 '+new Date(data.updatedAtUTC).toLocaleTimeString('ko-KR');
  const bonds={floating:'미접속',near:'입력 쪽 접속',both:'양쪽 접속'};
  common.textContent='다음 TEST 02 — '+(data.commonMode||[]).map(r=>`${bonds[r.bond]}: ${labels[r.stage]}${r.nativePreparationComplete?' · 양끝 연결 검사 완료':''}${r.time_ns!==undefined?' ('+r.time_ns.toFixed(2)+' ns)':''}`).join(' / ');
  if(data.batchStage==='raw_calculations_complete')common.textContent+=' · 원본 계산은 모두 끝났으며, 결과 해석과 보고서 반영은 아직 남아 있습니다.';
  if(data.batchStage!=='needs_review'&&![...data.rows,...(data.commonMode||[])].every(r=>['complete','error'].includes(r.stage)))setTimeout(update,30000);
 }catch(e){document.getElementById('connected-progress-status').textContent='실행 상태 기록을 불러오지 못했습니다.';console.error(e);}}
 await update();if(location.hash==='#connected-progress')section.scrollIntoView({behavior:'instant'});
})();
