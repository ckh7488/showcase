(()=>{
  'use strict';
  const root=document.querySelector('#signal-explainer');if(!root)return;
  const select=s=>root.querySelector(s);
  function reflection(mode){
    const matched=mode==='matched';
    root.querySelectorAll('[data-reflection]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.reflection===mode)));
    select('.reflection-visual').classList.toggle('is-matched',matched);
    select('#junction-label').textContent=matched?'잘 맞는 연결':'불연속 지점';
    select('#return-key').textContent=matched?'이상적으로는 돌아오는 성분 없음':'← 돌아오는 차동 신호';
    select('#return-key').classList.toggle('muted',matched);
    select('#reflection-caption').textContent=matched?'이상적으로 잘 맞는 연결에서는 이 지점에서 차동 반사가 생기지 않습니다.':'돌아오는 성분이 작을수록 차동 반사가 작습니다.';
    select('#reflection-desc').textContent=matched?'잘 맞는 이상적 연결에서는 차동 신호가 전달되며 이 지점에서 반사가 발생하지 않습니다.':'오른쪽으로 보낸 차동 신호 중 일부가 불연속 지점에서 왼쪽 입력으로 되돌아옵니다.';
  }
  function wavePath(f){
    return Array.from({length:301},(_,i)=>{const t=i/300*2;return (i?'L':'M')+(10+i/300*400).toFixed(2)+','+(52.5-35*f(t)).toFixed(2);}).join(' ');
  }
  function skew(delay){
    const p=t=>Math.sin(2*Math.PI*t),n=t=>-Math.sin(2*Math.PI*(t-delay));
    root.querySelectorAll('[data-skew-demo]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.skewDemo)===delay)));
    select('#p-wave').setAttribute('d',wavePath(p));select('#n-wave').setAttribute('d',wavePath(n));
    select('#cm-wave').setAttribute('d',wavePath(t=>(p(t)+n(t))/2));
    select('#cm-state').textContent=delay===0?'평균 = 0':'평균 ≠ 0';
    select('#conversion-caption').textContent=delay===0?'같은 크기로 정확히 반대인 두 파형은 평균이 0입니다.':'한쪽이 늦으면 평균이 0이 아니게 됩니다. 이것이 두 선에 같은 방향으로 포함되는 공통 성분입니다.';
    select('#pn-title').textContent=delay===0?'출력의 P와 N이 같은 크기로 정확히 반대로 변하는 파형':'출력에서 N이 P보다 한 주기의 15% 늦게 변하는 설명용 파형';
    select('#cm-title').textContent=delay===0?'P와 N의 평균은 모든 시점에서 0':'P와 N의 평균이 시간에 따라 0 위아래로 변하는 공통 성분';
  }
  root.querySelectorAll('[data-reflection]').forEach(b=>b.addEventListener('click',()=>reflection(b.dataset.reflection)));
  root.querySelectorAll('[data-skew-demo]').forEach(b=>b.addEventListener('click',()=>skew(Number(b.dataset.skewDemo))));
  reflection('mismatch');skew(.15);
})();
