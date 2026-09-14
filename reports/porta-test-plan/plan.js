(() => {
  'use strict';
  const $=id=>document.getElementById(id), params={...TEST_PLAN.defaults};
  let current=TEST_PLAN.tests.find(t=>t.id==='power'), role='all', ticket=0;
  const loads=new Map();
  function load(src){if(!loads.has(src))loads.set(src,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('자료를 불러오지 못했습니다: '+src));document.head.append(s);}));return loads.get(src);}
  async function loadSequence(paths){for(const path of paths)await load(path);}
  function makeButton(test,sequence=false){const b=document.createElement('button');b.dataset.test=test.id;b.setAttribute('aria-pressed','false');const small=document.createElement(sequence?'strong':'small');small.textContent=sequence?test.code+' · '+test.short:(test.id==='system'?'연결 단계 ':'TEST ')+test.code;const strong=document.createElement(sequence?'span':'strong');strong.textContent=sequence?({check:'계산 방법을 신뢰할 수 있는지',power:'전원쌍 배정 하나만 비교',common:'주입의 리턴과 실드 접속 비교',pcb:'기존 SI 재사용·잡음 응답 추가',system:'긴 선로·부하·실물로 연결'}[test.id]):test.short;b.append(small,strong);b.onclick=()=>{select(test.id);if(sequence)$('experiment').scrollIntoView({behavior:'smooth',block:'start'});};return b;}
  for(const t of TEST_PLAN.tests){$('test-tabs').append(makeButton(t));$('sequence-cards').append(makeButton(t,true));}
  function config(){
    const general={revision:TEST_PLAN.revision,baseline_revision:TEST_PLAN.baseline,status:'proposed_test_plan',solver_run:false,results:[],test_id:current.id,test_title:current.title,stage:current.id==='system'?'model_connection':'local_test',plain_explanation:current.plain,scope_route:current.route,cable_evidence:CABLE_SPEC,source:current.input,reference:current.reference,observations:current.probe,comparison:current.compare,limitations:current.limitation};
    if(current.scene==='coupon'&&current.kind!=='reference')Object.assign(general,{physical_coupon_assumptions:{unit:'mm',length:params.length,common_twist_pitch:params.pitch,centerline_to_finite_reference_plate:params.height,pair_centers_yz:CABLE_SPEC.displayModel.pairCenters_yz_mm,conductor_radius:CABLE_SPEC.displayModel.conductorRadius_mm,conductor_model:'equal copper area solid approximation; not measured strand bundle diameter',insulation_outer_radius:CABLE_SPEC.displayModel.insulationRadius_mm,pair_helix_radius:CABLE_SPEC.displayModel.pairHelixRadius_mm,foil_radius:CABLE_SPEC.displayModel.foilRadius_mm,braid_radius:CABLE_SPEC.displayModel.braidRadius_mm,jacket_outer_radius:CABLE_SPEC.displayModel.jacketRadius_mm,shield_thickness:null,dielectric_permittivity:null,dielectric_loss_tangent:null,braid_transfer_impedance:null,material_status:'Drawing identifies materials and nominal dimensions; electrical properties, shield details, pair arrangement and pitch remain assumptions',display_assumptions:CABLE_SPEC.displayModel.assumptions},power_pair_assignment:params.wiring==='same'?[['+24V','+24V'],['0V','0V']]:[['+24V','0V'],['+24V','0V']],equivalent_shield_included:true,shield_approximation:CABLE_SPEC.modelDecision.shield,external_RF_source:false,shield_bond_to_fixture:params.shield,fixture:{ethernet_differential_load_each_pair_each_end_ohm:100,power_far_end_load_ohm:100,source_series_resistance_ohm:current.kind==='dm'?100:[50,50],extra_common_mode_C_each_signal_pair_each_end_pF:params.cmCap,cap_topology:'Each signal leg to reference plate: C/2, applied at both ends. Geometric capacitance remains.',shield_bond_geometry:'must be specified; illustrative path is not an impedance value',drive:current.kind==='dm'?'AC between power + and 0 buses':'equal-phase AC of both power buses to finite reference plate'},proposed_solver:{method:'openEMS EC-FDTD',band_Hz:[10e6,200e6],gaussian_f0_Hz:105e6,gaussian_fc_Hz:95e6,band_status:'initial coupling investigation; not measured interference spectrum',EndCriteria:1e-5,confirmation_EndCriteria:1e-6,boundaries:['PML_8','PML_8','PML_8','PML_8','PML_8','PML_8'],mesh:null,air_margin:null,max_time_steps:null,port_boxes:null,geometry_status:'not yet a solver mesh',required_sweeps:['mesh/time/boundary/port reference plane','relative pair phase and individual twist pitches','insulation and shield properties; foil-braid contact and equivalent-shield approximation','common-mode terminations and source/load impedance']},normalization:current.kind==='dm'?'H=Vd_out / measured Vpower_input':'H=Vd_out / ((Vplus+Vzero)/2 - Vplate)',display:{axial_scale:.4,arrows:'excitation direction/phase, not computed field',mesh_overlay:'illustration only'}});
    if(current.id==='check')Object.assign(general,{reference_example:TEST_PLAN.sources.example.url,displayed_stub:$('stub').checked,example_geometry:{line_length_mm:100,width_mm:.6,substrate_height_mm:.254,epsilon_r:3.66,stub_length_mm:12},example_band_Hz:[0,7e9],port_boxes:'use original official source and verify its reference planes',results:[]});
    if(current.id==='pcb')Object.assign(general,{source_geometry:'Manufacturing Gerber, plated-via and component XY evidence copied with provenance',selected_segment:window.__pcbViewer?.snapshot().segment||'cable',display_markers:window.__pcbViewer?.snapshot().planMarkers||null,solver_ports:null,transformer:PCB_AUDIT.transformer,existing_audit_file:'data/pcb-audit.json',reuse_decision:PCB_AUDIT.reuseDecision,loads:'T2/TVS/PHY equivalent or multiport data required',mode_definition:'output mode first: Scd = common output from differential input; Sdc = differential output from common input',existing_results_status:'not adopted as validated EMC results'});
    if(current.id==='system')Object.assign(general,{external_model:'separate multiconductor transmission-line / circuit model coupled to verified local openEMS blocks',long_cable_m:20,breakout_near:'SMPS',power_branch:'short, length unknown',commercial_patch:'longer, length unknown',shield_end_bonds:[false,false],unverified:['electrical contact to steel table','sensor chassis / board ground impedance','PC earth / NIC termination','SMPS output0V to FG','coil geometry and inter-turn coupling'],required_model_connection_checks:['conductor order','voltage/current reference','port direction','impedance normalization','reference planes','units','two-length validation']});
    return general;
  }
  function updateConfig(){const c=config();$('config-preview').textContent=JSON.stringify(c,null,2);window.__testPlan.currentConfig=c;}
  function updateControls(){
    for(const name of['length','pitch','height']){$(name).value=params[name];$(name+'-out').textContent=params[name]+' mm';}
    $('shield').value=params.shield;$('cm-cap').value=params.cmCap;
    $('baseline').setAttribute('aria-pressed',String(params.wiring==='same'));$('paired').setAttribute('aria-pressed',String(params.wiring==='mixed'));
    const bonds={floating:'실드 양끝 미접속',near:'분기 끝만 시험판에 접속',both:'실드 양끝을 시험판에 접속'};
    $('comparison-note').textContent=`${params.wiring==='same'?'현재 전원 배정: +/+ · 0 V/0 V':'비교 배정: +/0 V · +/0 V'} / ${bonds[params.shield]}. `+(current.id==='power'?'시험 01의 기본 A/B는 실드를 미접속으로 고정하고 전원 핀 배정만 바꿉니다.':'시험 02의 기본 A/B는 전원 핀 배정을 고정하고 실드 접속만 바꿉니다.')+' 화면 조작은 형상·설정만 바꿉니다.';
    updateConfig();
  }
  function explain(selectedRole){role=selectedRole;document.querySelectorAll('.roles [data-role]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===role)));$('point-detail').textContent=role==='all'?current.included:role==='source'?current.input:role==='probe'?current.probe:current.reference;}
  function focus(selectedRole){explain(selectedRole);if(current.scene==='coupon')window.__trialScene?.focus(role);else if(current.scene==='pcb')window.__pcbViewer?.focusMarker?.(role);else if(role==='all')window.__labRoom?.selectView('room');else window.__labRoom?.focusPart?.({source:'smps',probe:'pc',reference:'table'}[role]);}
  async function select(id){
    const test=TEST_PLAN.tests.find(t=>t.id===id);if(!test)return;current=test;const thisTicket=++ticket;
    // Each test opens its stated baseline so a previous comparison cannot silently carry over.
    Object.assign(params,TEST_PLAN.defaults);
    for(const b of document.querySelectorAll('[data-test]'))b.setAttribute('aria-pressed',String(b.dataset.test===id));
    $('case-code').textContent=test.code;$('case-title').textContent=test.title;$('case-question').textContent=test.question;
    $('case-plain').textContent=({check:'간단한 선로를 계산해 포트·격자가 제대로 작동하는지 확인합니다.',power:'전원 두 묶음 사이에 잡음을 넣고, Ethernet 두 쌍의 양끝에서 읽습니다.',common:'전원 두 묶음을 시험판에 대해 함께 흔들고, 실드 끝 접속의 영향을 봅니다.',pcb:'기존 PCB의 SI 결과를 재사용하고, 공통모드 잡음이 신호로 바뀌는 경로를 추가합니다.',system:'짧은 모델을 20 m 선로·실제 부하와 연결합니다.'})[id];$('case-route').textContent=test.route;$('case-example').textContent=test.example||'';$('case-example').hidden=!test.example;$('cm-wiring').hidden=test.id!=='common';$('show-shield').checked=true;
    for(const key of['input','reference','probe','compare','decision'])$('recipe-'+key).textContent=test[key];
    for(const key of['included','excluded','limitation'])$(key).textContent=test[key];
    $('case-sources').replaceChildren();for(const key of test.sources){const s=TEST_PLAN.sources[key],a=document.createElement('a');a.href=s.url;a.textContent=s.label+' ↗';$('case-sources').append(a);}
    $('metrics').replaceChildren();for(const [name,unit]of test.metrics){const m=document.createElement('div');m.className='metric';const h=document.createElement('h4');h.textContent=name;const v=document.createElement('div');v.className='empty';v.textContent='—';const p=document.createElement('p');p.textContent=unit+' · 실행 전';m.append(h,v,p);$('metrics').append(m);}
    $('coupon-panel').hidden=test.scene!=='coupon';$('pcb-panel').hidden=test.scene!=='pcb';$('room-panel').hidden=test.scene!=='room';
    $('coupon-controls').hidden=test.scene!=='coupon'||test.kind==='reference';$('reference-controls').hidden=test.kind!=='reference';$('display-controls').hidden=test.scene!=='coupon';$('show-grid').closest('label').hidden=test.scene!=='coupon';$('show-shield').closest('label').hidden=test.kind==='reference';
    $('numerical-recipe').innerHTML='';const numerical=document.createElement('p');numerical.textContent=test.id==='check'?'먼저 공식 예제 원본의 0–7 GHz 조건을 재현합니다. 이 그림은 원본 포트의 측정면까지 확정한 solver 파일이 아닙니다.':test.scene==='coupon'?'초기 조사 대역은 10–200 MHz로 제안합니다. 실제 잡음 스펙트럼을 뜻하지 않으며 저주파 전원 강하는 별도 회로·실측 범위입니다. 재료 이름과 도면 치수는 확보했습니다. 주파수별 물성, 포일·편조의 전기적 결합, 포트 상자·격자·여유 공간은 실행 모델에서 명시해야 합니다. 화면의 동일 꼬임 피치와 상대 위상도 임시 가정이므로 개별 피치·배열을 달리한 민감도 비교가 필요합니다.':test.id==='pcb'?'제조 구리의 위치를 이용하되 포트 상자와 기준 도체 접속은 별도로 검증합니다. 모드 순서는 출력이 먼저입니다: Scd는 차동 입력→공통 출력, Sdc는 공통 입력→차동 출력입니다.':'국부 모델과 긴 선로 모델의 인터페이스를 먼저 검증합니다. 그림의 방·코일·테이블 치수와 근접 배치를 그대로 전자기 해석 형상으로 내보내지 않습니다.';$('numerical-recipe').append(numerical);
    explain('all');updateControls();
    try{
      if(test.scene==='coupon')window.__trialScene?.setCase(test,params);
      if(test.scene==='pcb'){await loadSequence(['geometry.js','phy-geometry.js','ground-vias.js','inner-copper.js','data/pcb-points.js','viewer.js']);if(ticket===thisTicket)window.__pcbViewer?.select({segment:'cable',pair:'both'});}
      if(test.scene==='room'){await loadSequence(['data/board-components.js','data/sensor-construction.js','room.js']);if(ticket===thisTicket)window.__labRoom?.selectView('room');}
      if(ticket===thisTicket)updateConfig();
    }catch(e){$('point-detail').textContent=e.message;console.error(e);}
  }
  function parameters(refit=false){window.__trialScene?.setParams(params);if(refit)focus('all');updateControls();}
  for(const name of['length','pitch','height'])$(name).oninput=()=>{params[name]=Number($(name).value);parameters(true);};
  $('baseline').onclick=()=>{params.wiring='same';parameters();};$('paired').onclick=()=>{params.wiring='mixed';parameters();};
  $('shield').onchange=()=>{params.shield=$('shield').value;parameters();};$('cm-cap').onchange=()=>{params.cmCap=Number($('cm-cap').value);parameters();};
  $('stub').onchange=()=>{window.__trialScene?.setStub($('stub').checked);updateConfig();};
  $('show-shield').onchange=()=>window.__trialScene?.setShieldVisible($('show-shield').checked);$('show-grid').onchange=()=>window.__trialScene?.setGridVisible($('show-grid').checked);
  $('reset-view').onclick=()=>focus('all');document.querySelectorAll('.roles [data-role]').forEach(b=>b.onclick=()=>focus(b.dataset.role));
  $('fullscreen').onclick=()=>{const target=current.scene==='coupon'?$('coupon-panel'):current.scene==='pcb'?$('pcb-panel').querySelector('.stage-wrap'):$('room-wrap');if(document.fullscreenElement)document.exitFullscreen();else target.requestFullscreen?.();};
  $('export-plan').onclick=()=>{const blob=new Blob([JSON.stringify(config(),null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='porta-'+current.id+'-proposed.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  window.addEventListener('planner:point',e=>{explain(e.detail.role);if(e.detail.text)$('point-detail').textContent=e.detail.text;});
  document.addEventListener('pcb-selection-change',()=>{if(current.id==='pcb'){explain('all');updateConfig();}});
  window.__testPlan={ready:true,currentConfig:null,select,snapshot:()=>({test:current.id,role,params:{...params},solverRun:false,results:[]})};
  const requested=new URLSearchParams(location.search).get('test');
  select(TEST_PLAN.tests.some(t=>t.id===requested)?requested:'power');
  // Links into folded source material must reveal it before scrolling.
  function revealHash(){
    const target=document.getElementById(location.hash.slice(1));if(!target)return;
    let parent=target;while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
    target.scrollIntoView({behavior:'instant'});
  }
  window.addEventListener('hashchange',revealHash);
  document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a&&a.hash===location.hash)revealHash();});
  if(location.hash)requestAnimationFrame(revealHash);
})();
