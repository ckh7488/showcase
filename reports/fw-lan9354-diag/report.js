const routes = {
  lidar: {
    title: 'LiDAR 외부선 / PortB',
    copy: 'LiDAR 케이블, 트랜스, PortB PHY가 marginal 상태인지 본다. 링크가 완전히 down이면 조용하지만, 애매하게 살아 있는 링크는 에러 프레임을 만들 수 있다.',
    visual: {
      src: 'sensor-assembly.jpg',
      alt: 'PALA720 회전 센서 어셈블리',
      badge: '센서 어셈블리에서 LiDAR 입력 경로 보기',
      labels: ['LiDAR', '슬립링 / 커넥터', 'Port2/B']
    },
    physicalTitle: 'LiDAR에서 LAN9354로 들어오는 길',
    physical: ['LiDAR', 'LiDAR to 슬립링 케이블', '슬립링 케이블', 'Control board 커넥터', 'LAN9354 Port2/B'],
    physicalCopy: 'LiDAR 쪽 케이블과 커넥터가 애매하게 살아 있으면 PortB에 오류 프레임이 들어올 수 있다.',
    metrics: [
      ['PHY B operational 100M', 'carrier up만으로 판단하지 않고 100M 운용 가능 상태인지 본다.'],
      ['P2 RX CRC / ALIGN / SYMBOL', 'LiDAR 방향에서 들어오는 물리계층 오류 burst를 본다.'],
      ['P2 BM_DRP / BM_RATE_DRP', 'PortB ingress가 switch buffer를 압박하는지 본다.']
    ],
    decision: 'PHY B operational bit가 떨어지거나 P2 RX error/BM drop 증가가 같은 시간대에 나타난다.'
  },
  fabric: {
    title: 'LAN9354 shared fabric / buffer',
    copy: 'PortB에서 들어온 garbage frame이 switch 내부 shared resource를 잡아먹어 Port0→Port1 정상 패킷까지 버리는지를 본다.',
    visual: {
      src: 'pcb-board-path.png',
      alt: 'PALA720 PCB 3D 경로 화면',
      badge: 'LAN9354 내부 fabric과 buffer manager',
      labels: ['Port2/B ingress', 'BM / fabric', 'Port1/A egress']
    },
    physicalTitle: 'PortB 입력이 스위치 내부를 압박하는 길',
    physical: ['LAN9354 Port2/B', 'shared packet buffer', 'buffer manager drop 판정', 'Port0 to Port1 정상 패킷 영향', 'PC 수신률 저하'],
    physicalCopy: '물리 배선 하나가 아니라 LAN9354 안의 shared resource를 보는 경로다. PortB 오류가 정상 DSP 패킷 손실과 붙는지를 본다.',
    metrics: [
      ['P2 RX → P1 TX core counters', 'LiDAR ingress와 PC egress의 같은 sample epoch 차이를 본다.'],
      ['P2 BM_DRP / SWE_FILTERED', '스위치가 PortB 입력을 실제로 버렸는지 본다.'],
      ['read_valid_mask / sample_rc', '진단 sample 자체가 믿을 수 있는 상태인지 먼저 확인한다.']
    ],
    decision: 'FW tx는 정상인데 PC 수신만 낮고, P2 error/drop과 switch drop 징후가 같은 구간에 붙는다.'
  },
  stm: {
    title: 'STM32 / RMII / FW 송신',
    copy: 'DSP 데이터가 애초에 MCU에서 1000 Hz로 나가지 못했는지 분리한다. 이 경우 LiDAR 외부선보다 FW 송신 루프와 ETH TX 경로가 먼저다.',
    visual: {
      src: 'pcb-board-path.png',
      alt: 'PALA720 PCB 3D 경로 화면',
      badge: 'PCB 3D에서 STM32와 LAN9354 사이 내부 경로 보기',
      labels: ['STM32', 'RMII', 'Port0']
    },
    physicalTitle: 'LAN9354와 STM32 사이의 내부 길',
    physical: ['STM32 ETH MAC', 'RMII 신호선 / 직렬 저항', 'LAN9354 Port0', 'FW UDP 6001 송신', '6002 FW TX counter'],
    physicalCopy: 'FW tx delta, ETH DMA, TX fail, RMII/Port0 징후를 봐서 MCU 송신 문제를 따로 뺀다.',
    metrics: [
      ['6001 FW tx counter delta', 'FW가 실제로 초당 몇 번 송신을 시도했는지 본다.'],
      ['ETH DMA / TX fail', 'HAL TX 실패, DMA fatal, tx gate closed를 본다.'],
      ['Port0 방향 징후', 'LAN9354 기준 Port0는 STM32/RMII 방향이다.']
    ],
    decision: 'FW tx delta 자체가 낮거나 ETH TX/DMA fail이 증가하면 MCU 송신 경로 문제로 본다.'
  },
  pc: {
    title: 'PortA / PC 수신 경로',
    copy: '스위치가 PC 쪽으로는 정상 송신했는데 앱이나 OS/NIC에서 놓친 것인지 분리한다.',
    visual: {
      src: 'pcb-board-path.png',
      alt: 'PALA720 Control board와 Motor board의 PCB 통신 경로 3D 화면',
      badge: 'PCB 3D에서 외부 PC 케이블 경로 보기',
      labels: ['LAN9354 Port1/A', 'Motor board / M12', '외부 PC 케이블']
    },
    physicalTitle: 'LAN9354에서 외부 케이블로 나가는 길',
    physical: ['LAN9354 Port1/A', 'Control board PCB 경로', 'Molex board-to-board', 'Motor board / M12 쪽', 'LLC12_18M / 외부 PC 케이블'],
    physicalCopy: 'P1 TX, PHY A state, PC 수신률을 같이 봐서 스위치 이후 경로를 분리한다.',
    metrics: [
      ['PHY A operational 100M', 'PC uplink가 carrier만 있는지, 실제 100M 운용 상태인지 본다.'],
      ['P1 TX OK / error', 'LAN9354가 PC 방향으로 내보낸 프레임 수와 오류를 본다.'],
      ['Wireshark / socket receive errors', 'NIC까지 왔는지와 앱 소켓에서 놓쳤는지를 나눈다.']
    ],
    decision: 'LAN9354 P1 TX까지 정상이고 Wireshark에는 보이는데 앱 Hz만 낮으면 PC 수신/표시 문제다.'
  },
  ptp: {
    title: 'PTP Delay_Req / Delay_Resp 경로',
    copy: 'DSP Hz 문제와 별개로 시간동기 응답 경로가 막히는지 확인한다. PTP는 multicast/socket/L2 timestamp queue가 엮이므로 별도 카운터가 필요하다.',
    visual: {
      src: 'pcb-board-path.png',
      alt: 'PALA720 PCB 3D 경로 화면',
      badge: 'PTP는 물리선보다 L2 수신과 timestamp queue를 따라 본다',
      labels: ['Delay_Req 수신', 'TS queue', 'Delay_Resp 송신']
    },
    physicalTitle: 'PTP 응답이 만들어지는 논리 경로',
    physical: ['PC Delay_Req', 'LAN9354 Port1/A', 'STM32 Ethernet RX', 'timestamp queue pop', 'Delay_Resp 송신'],
    physicalCopy: 'DSP 패킷 손실과 같은 선로를 지나지만, 판정은 L2 seen, timestamp queue, response fail 카운터로 따로 한다.',
    metrics: [
      ['Delay_Req L2 seen', 'Ethernet RX pbuf에서 PTP Delay_Req가 감지됐는지 본다.'],
      ['TSQ count / overwrite', 'timestamp queue가 밀려 기존 이벤트를 덮었는지 본다.'],
      ['pop_ok / pop_miss / resp_fail', '응답 timestamp 매칭과 Delay_Resp 송신 실패를 본다.']
    ],
    decision: 'L2 seen은 증가하는데 pop_miss나 resp_fail이 붙으면 PTP 응답 경로를 DSP packet loss와 분리해서 본다.'
  }
};

const stage = document.querySelector('.stage');
const routeVisual = document.querySelector('.route-visual');
const routeVisualImage = document.querySelector('#route-visual-img');
const routeVisualBadge = document.querySelector('#route-visual-badge');
const visualLabels = [
  document.querySelector('#visual-start'),
  document.querySelector('#visual-mid'),
  document.querySelector('#visual-end')
];
const title = document.querySelector('#route-title');
const copy = document.querySelector('#route-copy');
const decision = document.querySelector('#route-decision');
const metrics = document.querySelector('#route-metrics');
const physicalTitle = document.querySelector('#physical-title');
const physicalPath = document.querySelector('#route-path');
const physicalCopy = document.querySelector('#physical-copy');
const tabs = Array.from(document.querySelectorAll('.route-tabs button'));

function renderRoute(key) {
  const route = routes[key];
  if (!route) return;

  stage.dataset.activeRoute = key;
  routeVisual.dataset.route = key;
  routeVisualImage.src = route.visual.src;
  routeVisualImage.alt = route.visual.alt;
  routeVisualBadge.textContent = route.visual.badge;
  visualLabels.forEach((label, index) => {
    label.textContent = route.visual.labels[index] || '';
  });
  title.textContent = route.title;
  copy.textContent = route.copy;
  decision.textContent = route.decision;
  physicalTitle.textContent = route.physicalTitle;
  physicalCopy.textContent = route.physicalCopy;
  physicalPath.innerHTML = route.physical.map((item) => `<li>${item}</li>`).join('');
  metrics.innerHTML = route.metrics.map(([name, text]) => (
    `<div class="metric"><b>${name}</b><span>${text}</span></div>`
  )).join('');

  tabs.forEach((button) => {
    const active = button.dataset.route === key;
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  });
}

tabs.forEach((button) => {
  button.addEventListener('click', () => renderRoute(button.dataset.route));
});

renderRoute('lidar');
