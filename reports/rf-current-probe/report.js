"use strict";
const steps = [
  {kicker:"0 / VNA 오차부터 정리",title:"케이블 끝에서 O/S/L/T 교정",purpose:"VNA와 두 테스트 케이블의 영향을 교정합니다. 이 단계만으로 프로브의 감도가 정해지는 것은 아닙니다.",actions:["실제 장비 HW/FW/GUI, 케이블·표준의 모델과 성별을 확인합니다.","각 케이블 끝에 Open / Short / Load를 순서대로 연결하고 두 끝 사이의 Thru를 측정합니다.","지원되는 전체 2포트 교정을 적용하고 검증용 부하·Thru를 다시 연결해 확인합니다."],p2:"교정 표준 / Thru",load:"SOLT용 표준 Load를 순서대로 사용",file:"calibration/ + setup 사진·장비 설정",key:"교정 표준 Load와 측정 중 사용하는 외장 50 Ω 부하는 역할을 구분합니다.",caption:"교정 기준면은 케이블 끝입니다. 지그와 프로브를 연결하기 전에 VNA 측정 경로를 교정합니다.",alt:"P1과 P2 테스트 케이블 끝에서 OSL 표준과 Thru로 교정하는 개념도"},
  {kicker:"1 / 지그의 기본 상태",title:"헤드를 빼고, 지그만 측정",purpose:"새 PCB 지그 자체가 신호를 얼마나 반사하고 통과시키는지 확인합니다. 아직 프로브 감도를 측정하는 단계가 아닙니다.",actions:["RF OFF에서 P1 케이블을 지그 IN에 연결합니다.","P2 케이블을 지그 OUT에 연결합니다. 프로브는 분리하고 외장 50 Ω 부하는 붙이지 않습니다.","RF를 켜고 반사·손실·위상을 저장합니다. 케이블 위치와 지그 사진도 남깁니다."],p2:"지그 OUT",load:"사용하지 않음 — P2가 일차 종단",file:"fixture_empty.s2p",key:"P2가 이미 50 Ω 수신기입니다. 지그 OUT에 부하를 추가로 병렬 연결하지 않습니다.",caption:"신호는 P1 → PCB 지그 → P2로 갑니다. 지그 출구의 P2가 50 Ω 종단 역할을 합니다.",alt:"헤드 없이 P1에서 PCB 지그 IN을 거쳐 OUT과 P2로 연결하고 외장 부하는 사용하지 않는 연결도"},
  {kicker:"2 / 프로브가 전류 경로에 주는 영향",title:"헤드를 달고, 출력을 50 Ω로",purpose:"프로브를 장착하면 원래 전류 경로가 얼마나 바뀌는지 확인합니다. 이전 단계와 같은 지그 through 연결을 유지합니다.",actions:["RF OFF에서 집게를 열어 중앙 SIG 다리만 코어 구멍으로 통과시킵니다. 양옆 귀환 레일은 밖에 둡니다.","헤드를 닫고 프로브 SMA 출력에 외장 50 Ω 부하를 연결합니다. P2는 지그 OUT에 그대로 둡니다.","RF를 켜고 through를 다시 저장해 1단계와 비교합니다. 헤드 방향·도체 위치·잠금 상태를 기록합니다."],p2:"지그 OUT — 이전 단계와 같음",load:"프로브 SMA 출력",file:"fixture_probe_loaded.s2p",key:"이 단계의 S21은 지그의 전달 특성입니다. 프로브의 출력 감도 ZT가 아닙니다.",caption:"P1 → 지그 → P2는 그대로입니다. 새로 붙인 프로브의 출력만 외장 50 Ω로 종단합니다.",alt:"P2는 지그 OUT에 유지하고 중앙 경로에 장착한 프로브 출력에 외장 50옴 부하를 연결하는 그림"},
  {kicker:"3 / 프로브가 내보내는 신호",title:"P2와 외장 부하의 자리를 바꿉니다",purpose:"이번에는 지그 입력에 대해 프로브가 내보내는 신호를 읽습니다. 전류 모델을 입증하기 전에는 상대 S21로 기록합니다.",actions:["RF OFF. P2 케이블을 지그 OUT에서 빼고, 외장 50 Ω 부하를 프로브 출력에서 뺍니다.","외장 50 Ω 부하는 지그 OUT으로 옮기고, P2 케이블은 프로브 SMA 출력에 연결합니다. P1은 그대로 둡니다.","두 경로의 종단을 확인한 뒤 RF를 켜고 S-parameter와 메타데이터를 저장합니다."],p2:"프로브 SMA 출력",load:"지그 OUT",file:"probe_transfer_01.s2p + .json",key:"지그 OUT은 외장 부하로, 프로브 출력은 P2로 각각 한 번씩 종단됩니다.",caption:"P2가 프로브로 이동합니다. 프로브에 있던 외장 부하는 지그 출구로 이동합니다. 두 SMA 위치를 모델에서 비교해 보세요.",alt:"P1은 지그 IN에 유지하고 지그 OUT에는 외장 50옴 부하, 프로브 출력에는 P2 케이블을 연결한 전달 측정 그림"}
];
let activeStep=0;
function selectStep(index){
  activeStep=index;const s=steps[index];
  for(const [id,key] of [["step-kicker","kicker"],["step-title","title"],["step-purpose","purpose"],["step-p2","p2"],["step-load","load"],["step-file","file"],["step-key","key"],["step-caption","caption"]]) document.getElementById(id).textContent=s[key];
  const actions=document.getElementById("step-actions");actions.replaceChildren(...s.actions.map(text=>{const li=document.createElement("li");li.textContent=text;return li;}));
  document.getElementById("solt-controls").hidden=index!==0;
  window.rfcpViewers?.calibration?.setStep(index);
  document.querySelector("#calibration-cad .cad-badge").textContent=index===0?"교정 표준·케이블 · 외형 예시":"원본 CAD · PCB A0.1 / 집게 A0.3";
  document.querySelectorAll("[data-step]").forEach(btn=>btn.setAttribute("aria-pressed",String(Number(btn.dataset.step)===index)));
  document.getElementById("previous-step").disabled=index===0;document.getElementById("next-step").disabled=index===3;document.getElementById("step-count").textContent=`${index+1} / 4`;
}
document.querySelectorAll("[data-step]").forEach(btn=>btn.addEventListener("click",()=>selectStep(Number(btn.dataset.step))));
document.getElementById("previous-step").addEventListener("click",()=>selectStep(Math.max(0,activeStep-1)));
document.getElementById("next-step").addEventListener("click",()=>selectStep(Math.min(3,activeStep+1)));
const pathNotes={all:"가운데 신호 길과 양옆 귀환 길은 서로 다른 동박입니다. 두 귀환은 양끝 EndPanel에서 SMA 외피와 연결됩니다.",signal:"① 신호: IN의 SMA 중심 → 짧은 연결선 → 중앙 SIG 다리 → 짧은 연결선 → OUT의 SMA 중심. 코어 안에는 이 경로만 통과합니다.",return:"② 귀환: OUT의 SMA 외피 → EndPanel → 양옆 귀환 레일 → IN EndPanel → IN의 SMA 외피. 귀환 레일은 코어 구멍 밖에 있습니다."};
document.querySelectorAll("[data-path]").forEach(btn=>btn.addEventListener("click",()=>{const mode=btn.dataset.path;document.querySelectorAll("[data-path]").forEach(b=>b.setAttribute("aria-pressed",String(b===btn)));window.rfcpViewers?.structure?.setPath(mode);document.getElementById("path-explanation").textContent=pathNotes[mode];}));
function updateExample(){const dB=Number(document.getElementById("s21-db").value), mv=Number(document.getElementById("voltage-mv").value);const valid=["s21-db","voltage-mv"].every(id=>{const n=document.getElementById(id);return n.value!==""&&n.checkValidity();})&&Number.isFinite(dB)&&Number.isFinite(mv);const ratio=10**(dB/20),zt=50*ratio;document.getElementById("s21-linear").textContent=valid?ratio.toFixed(4):"—";document.getElementById("zt-value").textContent=valid?`${zt.toFixed(3)} Ω`:"—";document.getElementById("current-value").textContent=valid?`${(mv/zt).toFixed(3)} mA RMS`:"—";document.getElementById("calculator-note").textContent=valid?"같은 주파수·교정 체인에서 단일 정현파의 RMS 값끼리 계산합니다. 이 예제는 센서 감도·최소 검출 전류를 보장하지 않습니다.":"S21은 −80~0 dB, 전압은 0~1000 mV 범위의 숫자를 입력하세요. 실제 교정용 입력 범위가 아닌 설명용 예제 범위입니다.";}
["s21-db","voltage-mv"].forEach(id=>document.getElementById(id).addEventListener("input",updateExample));
updateExample();

const requestedStep=Number(new URLSearchParams(location.search).get("step")||0);
selectStep(Number.isInteger(requestedStep)&&requestedStep>=0&&requestedStep<=3?requestedStep:0);
