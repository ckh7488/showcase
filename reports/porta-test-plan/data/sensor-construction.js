/* Adapted mechanical illustration from ATLAS; not a solver mesh. */
function buildAtlasSensor(ctx) {
const {T,assembly,shell,baseGroup,cutShell,mechanics,wireGroup,mat,metal,black,plastic,gold,colors,data,tag,box,cyl,tube,label,ring}=ctx;
let view="inside", explode=0;
// Source drawing: rear support to fork tip 489 mm; support depth 113 mm.
const bodyMat=mat(0x14181d,{metalness:.42,roughness:.5,side:T.DoubleSide});
const profile=[[77.5,7],[77.5,24],[74,47],[65,80],[54,114],[47,132],[42,140],[46,146]].map(p=>new T.Vector2(...p));
const housing=new T.Mesh(new T.LatheGeometry(profile,80),bodyMat);shell.add(housing);tag(housing,'shell','PL720-2G-0000-OS · 155 × 182 × 489 mm 조립도 + PPT 32쪽 외장. 검은 테이퍼 몸체, 좁은 목, 가공 포켓과 슬롯 지지대를 단순화해 반영했습니다.');
const halfHousing=new T.Mesh(new T.LatheGeometry(profile,48,Math.PI,Math.PI),bodyMat);cutShell.add(halfHousing);cutShell.visible=false;
cyl(baseGroup,0,3,0,77.5,9,black);cyl(baseGroup,0,-9,0,61,17,metal);ring(shell,143,46,32,4,black);
for(let a=0;a<Math.PI*2;a+=Math.PI/6){const r=73;cyl(baseGroup,Math.cos(a)*r,9,Math.sin(a)*r,2.2,4,metal);}
// Recessed exterior pockets indicated by raised narrow rims, based on PPT rendering.
for(let a=0;a<Math.PI*2;a+=Math.PI/6){const points=[];for(const [r,y,da] of [[77.9,19,-.20],[78,30,-.20],[72,53,-.14],[65.5,79,-.07],[72,53,.14],[78,30,.20],[77.9,19,.20],[77.9,19,-.20]])points.push([Math.sin(a+da)*r,y,Math.cos(a+da)*r]);tube(shell,points,1.4,0x232930,40);}
function slotPath(x,y,w,h){const p=new T.Path();p.moveTo(x-w/2+h/2,y-h/2);p.lineTo(x+w/2-h/2,y-h/2);p.absarc(x+w/2-h/2,y,h/2,-Math.PI/2,Math.PI/2,false);p.lineTo(x-w/2+h/2,y+h/2);p.absarc(x-w/2+h/2,y,h/2,Math.PI/2,Math.PI*1.5,false);return p;}
for(const z of [-85,85]){const leg=new T.Shape();leg.moveTo(-35,0);leg.lineTo(35,0);leg.lineTo(35,-107);leg.lineTo(-35,-107);leg.closePath();for(const y of [-24,-51,-78])leg.holes.push(slotPath(0,y,49,14));const legMesh=new T.Mesh(new T.ExtrudeGeometry(leg,{depth:5,bevelEnabled:false}),black);legMesh.position.z=z-2.5;baseGroup.add(legMesh);box(baseGroup,0,-110,z+(z<0?-5:5),70,6,18,black);for(const x of [-27.5,0,27.5]){const screw=cyl(baseGroup,x,-106,z+(z<0?-7:7),3.25,1,metal);}}
// Fork carries the LiDAR across its two plates; external rotation axis is Y.
const fork=new T.Group();mechanics.add(fork);
const fs=new T.Shape();fs.moveTo(-47,153);fs.lineTo(-47,170);fs.lineTo(-22,265);fs.quadraticCurveTo(-23,280,-34,288);fs.absarc(0,330,46,Math.PI*1.24,Math.PI*-.24,true);fs.lineTo(22,265);fs.lineTo(47,170);fs.lineTo(47,153);fs.closePath();
for(const z of [-46,41]){const plateShape=fs.clone();if(z===41){const window=new T.Path();window.absarc(0,330,33,0,Math.PI*2,true);plateShape.holes.push(window);}const plate=new T.Mesh(new T.ExtrudeGeometry(plateShape,{depth:5,bevelEnabled:false,curveSegments:36}),metal);plate.position.z=z;fork.add(plate);
const rib=new T.Shape();rib.moveTo(-31,177);rib.lineTo(31,177);rib.lineTo(13,261);rib.lineTo(-13,261);rib.closePath();const inset=new T.Mesh(new T.ExtrudeGeometry(rib,{depth:1,bevelEnabled:false}),mat(0x7e8994));inset.position.z=z===41?46.1:-47.1;fork.add(inset);
for(const [x,y] of [[-31,173],[31,173],[0,276],[-31,355],[31,355]]){const bolt=cyl(fork,x,y,z===41?47:-48,2.3,1.6,metal);bolt.rotation.x=Math.PI/2;}}
box(fork,0,163,0,94,12,82,metal);
box(fork,0,211,0,59,5,82,metal);
const lidar=cyl(fork,0,330,0,40,79,black);lidar.rotation.x=Math.PI/2;tag(lidar,'lidar','Ouster OS1 계열 · PPT 35·44쪽은 OS1-16으로 표기. 센서 자체 축은 포크의 외부 회전축과 직교합니다. 정확한 개별 치수는 외형도에 맞춘 근사입니다.');
for(const z of [-39,39]){const cap=cyl(fork,0,330,z,44,6,metal);cap.rotation.x=Math.PI/2;for(let i=0;i<24;i++){const fin=box(fork,Math.cos(i*Math.PI/12)*40,330+Math.sin(i*Math.PI/12)*40,z,3,9,8,metal);fin.rotation.z=i*Math.PI/12-Math.PI/2;}}
const scan=cyl(fork,0,330,0,40.7,39,mat(0x263c47,{metalness:.35,roughness:.22}));scan.rotation.x=Math.PI/2;
label('Ouster OS1 · 회전측',fork,[0,380,0],['sensor','inside']);
// Boards retain source XY and mounting-hole alignment. Control offset is exact: (4.98,12.45).
function board(name,color,shift){const src=data[name],g=new T.Group();const offset=name==='encoder_interposer_rs422'?[133.8,90.55]:[156.3+shift[0],95.9+shift[1]];
const shape=new T.Shape();src.outline[0].forEach((p,i)=>{const x=p[0]-offset[0],y=-(p[1]-offset[1]);i?shape.lineTo(x,y):shape.moveTo(x,y);});shape.closePath();
const holes=[];for(const f of src.parts)for(const p of f.pads){if(p.drill[0]>0 && !holes.some(q=>Math.hypot(q[0]-p.xy[0],q[1]-p.xy[1])<.01)){holes.push(p.xy);const hp=new T.Path();hp.absarc(p.xy[0]-offset[0],-(p.xy[1]-offset[1]),p.drill[0]/2,0,Math.PI*2,true);shape.holes.push(hp);}}
const base=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:1.6,bevelEnabled:false}),mat(color));base.rotation.x=-Math.PI/2;g.add(base);tag(base,name,name==='Motor_board'?'Motor board · 약 97.7 × 97.6 mm. CON1 외부 입력, CON2 적층 연결, 전원 보호/5V 변환, 모터 권선/Hall 연결.':name==='Control_board'?'Control board · 약 109.1 × 83.5 mm. STM32F407, LAN9354, Ethernet 트랜스, LiDAR·RS422 엔코더 커넥터.':'EM2 RS422 인터포저 · 25 × 25 mm · EM2와 AM26LS31 · PCB 형상은 원본, 기구 장착 위치는 추정');
const texCanvas=document.createElement('canvas');texCanvas.width=1400;texCanvas.height=1400;const ctx=texCanvas.getContext('2d');const [bx,by,bw,bh]=src.bounds;const sc=1400/Math.max(bw,bh);const px=x=>(x-bx)*sc,py=y=>(y-by)*sc;
for(const back of [false,true]){ctx.clearRect(0,0,1400,1400);ctx.strokeStyle=back?'rgba(109,171,154,.28)':'rgba(134,190,142,.44)';for(const t of src.tracks){if(!!t[5]!==back)continue;ctx.lineWidth=Math.max(.8,t[4]*sc);ctx.beginPath();ctx.moveTo(px(t[0]),py(t[1]));ctx.lineTo(px(t[2]),py(t[3]));ctx.stroke();}ctx.fillStyle='#d6b76a';for(const f of src.parts)for(const p of f.pads){if(!p.n)continue;ctx.fillRect(px(p.xy[0]-p.size[0]/2),py(p.xy[1]-p.size[1]/2),Math.max(1,p.size[0]*sc),Math.max(1,p.size[1]*sc));}ctx.font='10px sans-serif';ctx.fillStyle='#e0e5d4';for(const f of src.parts){if(f.back!==back)continue;if(/^(U|J|CON|T|F)/.test(f.ref))ctx.fillText(f.ref,px(f.xy[0])+3,py(f.xy[1])-5);}
const tc=document.createElement('canvas');tc.width=1400;tc.height=1400;tc.getContext('2d').drawImage(texCanvas,0,0);const texture=new T.CanvasTexture(tc);texture.encoding=T.sRGBEncoding;const plane=new T.Mesh(new T.PlaneGeometry(1400/sc,1400/sc),new T.MeshBasicMaterial({map:texture,transparent:true,side:T.DoubleSide,depthWrite:false}));plane.rotation.x=-Math.PI/2;plane.position.set(bx+700/sc-offset[0],back?-.04:1.64,by+700/sc-offset[1]);g.add(plane);}
for(const f of src.parts){if(f.ref.startsWith('H'))continue;const x=f.xy[0]-offset[0],z=f.xy[1]-offset[1],connector=/^(J|CON)/.test(f.ref);let w=Math.max(.7,Math.min(f.box[2]*.72,32)),d=Math.max(.6,Math.min(f.box[3]*.72,32)),h=connector?5:/^C/.test(f.ref)&&f.fp.includes('Elec')?9:/^L/.test(f.ref)?5:/^(U|T)/.test(f.ref)?1.8:.8;
if(f.ref==='CON2'){w=5;d=33;h=name==='Control_board'?6:4;}
let m=connector?plastic:/^C/.test(f.ref)?mat(0x827d62):black;
if(name==='Motor_board'&&f.ref==='CON1'){w=8;d=8;h=3;m=plastic;}
const o=box(g,x,f.back?-h/2:1.6+h/2,z,w,h,d,m);tag(o,name,f.ref+' · '+f.value+' · '+(f.back?'보드 뒷면':'보드 앞면')+' · XY는 PCB 원본, 몸체 높이/외형은 단순화');}
g.userData.src=src;g.userData.offset=offset;assembly.add(g);return g;}
const motorBoard=board('Motor_board',colors.pcb,[0,0]),controlBoard=board('Control_board',colors.pcb2,[4.98,12.45]);motorBoard.position.y=22;controlBoard.position.y=38.534;
label('Motor board · 아래',motorBoard,[66,0,18],['boards']);label('Control board · 위',controlBoard,[68,7,-6],['boards']);
label('Control 위 / Motor 아래 · 2단 PCB',motorBoard,[75,16,20],['inside']);
label('CON2 · 64핀 적층',motorBoard,[-57,15,-6],['boards']);
for(const p of [[113.8,86.9],[196.3,100.9],[193.3,80.4]]){cyl(assembly,p[0]-156.3,34,p[1]-95.9,2.7,19,gold);}
ring(mechanics,61,39,19,5,gold);ring(mechanics,66,30,19,3,black);
tag(ring(mechanics,69,30,19,22,metal),'motor','Maxon 542002 · EC frameless 60 flat, 100W. PPT 단면의 모터부 순서를 반영했고 높이는 표시용 근사입니다.');
for(let i=0;i<12;i++){const a=i*Math.PI/6;const winding=box(mechanics,Math.cos(a)*24,69,Math.sin(a)*24,6,6,6,mat(0xb26e39));winding.rotation.y=-a;}
ring(mechanics,92,40,18,4,gold);
tag(ring(mechanics,106,38,16,25,metal),'gear','SHD17 50:1 하모닉 감속기 · PPT 32·34·39쪽. 자료의 조립 순서를 반영한 다단 원통 근사이며 톱니/베어링 내부 형상을 복제하지 않았습니다.');
ring(mechanics,111,38.6,35,4,mat(0x7f3558));ring(mechanics,128,35,15,4,black);
const disk=ring(mechanics,99,38,18,1.5,mat(0x302e2a));tag(disk,'encoder','EM2 디텍터 + 엔코더 디스크 · 현재 KiCad RS422 인터포저로 연결. 디텍터의 디스크 대비 단차는 표시용이며 실제 조립 간극을 의미하지 않습니다.');
for(let i=0;i<80;i++){const a=i*Math.PI/40;const mark=box(mechanics,Math.cos(a)*34,101,Math.sin(a)*34,1,.3,4,plastic);mark.rotation.y=-a;}
const interposer=board('encoder_interposer_rs422',colors.pcb,[0,0]);mechanics.add(interposer);interposer.position.set(39,99,0);
ring(mechanics,137,43,16,4,gold);ring(mechanics,142,30,15,7,black);ring(mechanics,151,36,14,6,gold);
ring(fork,170,30,11,10,mat(0xe1c75c));cyl(fork,0,183,0,13,7,metal);
const slip=cyl(mechanics,0,201,0,7,34,black);tag(slip,'slip','SRS1202 계열 슬립링 · PPT 38·42쪽에서 모델 계열과 Ouster 케이블 핀맵 확인. 포크 중앙 축선을 통과하는 위치로 수정했습니다. CH/CZ 세부 형번·정확한 치수는 자료 간 차이가 남습니다.');
cyl(mechanics,0,190,0,13,3,black);cyl(mechanics,0,220,0,6,8,metal);
label('Maxon 모터 + EM2',mechanics,[65,79,0],['inside']);label('50:1 하모닉 감속부',mechanics,[60,126,0],['inside']);label('SRS1202 · 슬립링',mechanics,[-58,207,0],['inside']);
// Separate external M12 and PCB CON1: different pin-number systems.
const m12=cyl(assembly,-21,-10,39,8,24,metal);tag(m12,'m12','ATLAS 기존 핀맵 · 이번 배선 확인 전. 외부 M12 8핀 → 내부 하네스 → Motor CON1. 케이블 M12: TX 8/2, RX 3/4, +24V 1/7, 0V 5/6. PCB CON1: TX 8/7, RX 6/5, +24V 1/2, GND 3/4. 핀 번호가 직접 일치하지 않습니다.');
label('센서 M12 → Motor CON1',assembly,[-95,-24,48],['inside','boards']);label('PL720 회전구동장치',assembly,[110,100,35],['sensor']);
function wires(){while(wireGroup.children.length){const o=wireGroup.children[0];wireGroup.remove(o);o.geometry.dispose();o.material.dispose();}const cy=controlBoard.position.y, lift=explode*.8;
tube(wireGroup,[[-21,1,39],[-31,12,33],[-37,24,21]],1.5,colors.ethernet);
tube(wireGroup,[[-35,24,-6],[-37,cy-5,-6]],1.1,colors.ethernet);
if(view==='boards'){
tube(wireGroup,[[17.37,cy+5,11.70],[28,cy+16,20],[28,cy+28,20]],1.6,colors.ethernet);
tube(wireGroup,[[-3.4,28,38.8],[-10,40,41],[-10,62,41]],1.4,colors.power);
tube(wireGroup,[[25,cy+3,-25],[37,cy+14,-18],[37,cy+28,-18]],1,colors.signal);
}else{
tube(wireGroup,[[17.37,cy+5,11.70],[29,cy+14,17],[8,111+lift,8],[0,173+lift,0],[0,225+lift,0],[0,260+lift,35],[0,308+lift,39]],1.6,colors.ethernet);
tube(wireGroup,[[-3.4,28,38.8],[-12,67+lift,22],[-6,130+lift,8],[3,173+lift,0],[3,226+lift,0],[4,257+lift,32],[6,309+lift,36]],1.4,colors.power);
tube(wireGroup,[[25,cy+3,-25],[45,cy+15,-18],[39,100+lift,0]],1,colors.signal);}
tube(wireGroup,[[5.8,28,22.5],[23,55,25],[24,80,7]],1.4,colors.power);
}
wires();

return {motorBoard,controlBoard,mechanics,shell,cutShell,baseGroup,fork,wireGroup,wires,setLayout(next,amount){view=next;explode=amount;controlBoard.position.y=38.534+amount*.8;mechanics.position.y=amount*.8;wires();}};
}
