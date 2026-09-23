"use strict";
(() => {
 const data=window.FIXTURE_BOM,$=id=>document.getElementById(id);
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 // Both the per-board planner and the existing active-setup table use this data.
 function aggregate(counts){
  const totals=new Map();
  for(const module of data.modules){
   const count=counts[module.id]??0;
   if(!Number.isSafeInteger(count)||count<0)throw new Error('보드 장수는 0 이상의 정수여야 합니다.');
   if(count===0)continue;
   for(const line of module.lines){
    const part=data.parts[line.part_id];
    if(!totals.has(line.part_id))totals.set(line.part_id,{part_id:line.part_id,...part,quantity:0,contributions:[]});
    const total=totals.get(line.part_id),quantity=count*line.quantity_per_board;
    if(!Number.isSafeInteger(total.quantity+quantity))throw new Error('수량이 계산 범위를 넘었습니다.');
    total.quantity+=quantity;total.contributions.push({module_id:module.id,module_name:module.name,board_count:count,quantity_per_board:line.quantity_per_board,quantity});
   }
  }
  return [...totals.values()];
 }
 window.aggregateFixtureBom=aggregate;
 let current=null;
 const breakdown=p=>p.contributions.map(c=>`${c.module_name} ${c.board_count}장 × ${c.quantity_per_board}`).join(' + ');
 function render(){
  const counts={};let valid=true;
  for(const module of data.modules){const input=$('count-'+module.id),n=input.valueAsNumber;const ok=input.value!==''&&Number.isInteger(n)&&n>=0&&n<=9999;input.setAttribute('aria-invalid',String(!ok));if(!ok)valid=false;counts[module.id]=n;}
  $('downloadBuildBom').disabled=$('downloadBuildJson').disabled=!valid;
  if(!valid){current=null;$('buildBomRows').replaceChildren();$('buildBomStatus').textContent='각 보드 장수에 0–9999 범위의 정수를 입력하세요. 빈칸·소수·음수는 합산하지 않습니다.';return;}
  current={schema_version:1,bom_source:'bom.json',bom_date:data.date,quantity_basis:'required_for_board_assembly',module_counts:counts,parts:aggregate(counts),external_items_included:false,unresolved:data.unresolved};
  const boards=Object.values(counts).reduce((a,b)=>a+b,0);$('buildBomStatus').textContent=boards?`보드 ${boards}장 · 실장 부품/PCB ${current.parts.length}종. 동일 부품은 합산했습니다.`:'보드 0장 · 합산할 부품이 없습니다.';
  $('buildBomRows').innerHTML=current.parts.map(p=>`<tr data-part-id="${p.part_id}"><td>${esc(p.name)}</td><td><code>${esc(p.mpn||p.revision)}</code></td><td data-quantity="${p.quantity}">${p.quantity} ${esc(p.unit)}</td><td>${esc(breakdown(p))}</td></tr>`).join('');
 }
 const save=(name,text,type)=>{const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('downloadBuildBom').onclick=()=>{if(!current)return;const q=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const rows=[['part_id','name','mpn','revision','required_quantity','unit','board_breakdown'],...current.parts.map(p=>[p.part_id,p.name,p.mpn,p.revision,p.quantity,p.unit,breakdown(p)])];save('fixture-build-bom.csv','\ufeff'+rows.map(r=>r.map(q).join(',')).join('\r\n'),'text/csv;charset=utf-8');};
 $('downloadBuildJson').onclick=()=>{if(current)save('fixture-build-bom.json',JSON.stringify(current,null,2)+'\n','application/json');};
 $('useSetupCounts').onclick=()=>{const ends=[$('left').value,$('right').value];for(const m of data.modules)$('count-'+m.id).value=m.id==='common'?2:ends.filter(x=>x===m.id).length;render();};
 for(const m of data.modules)$('count-'+m.id).addEventListener('input',render);
 render();
})();
