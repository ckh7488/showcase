const routes = {
  lidar: {
    title: 'LiDAR 외부선 / PortB',
    copy: 'LiDAR 케이블, 트랜스, PortB PHY가 marginal 상태인지 본다. 링크가 완전히 down이면 조용하지만, 애매하게 살아 있는 링크는 에러 프레임을 만들 수 있다.',
    physicalTitle: 'LiDAR에서 LAN9354로 들어오는 길',
    physical: ['LiDAR', 'LiDAR to 슬립링 케이블', '슬립링 케이블', 'Control board 커넥터', 'LAN9354 Port2/B'],
    metrics: [
      ['PHY B operational 100M', 'PortB가 실제 운용 가능한 상태인지'],
      ['P2 RX CRC / ALIGN / SYMBOL', 'LiDAR 방향 물리 오류 burst'],
      ['P2 BM_DRP / BM_RATE_DRP', 'PortB 입력의 switch buffer 압박']
    ],
    decision: 'PHY B operational bit가 떨어지거나 P2 RX error/BM drop 증가가 같은 시간대에 나타난다.'
  },
  fabric: {
    title: 'LAN9354 shared fabric / buffer',
    copy: 'PortB에서 들어온 garbage frame이 switch 내부 shared resource를 잡아먹어 Port0→Port1 정상 패킷까지 버리는지를 본다.',
    physicalTitle: 'PortB 입력이 스위치 내부를 압박하는 길',
    physical: ['LAN9354 Port2/B', 'shared packet buffer', 'buffer manager drop 판정', 'Port0 to Port1 정상 패킷 영향', 'PC 수신률 저하'],
    metrics: [
      ['P2 RX → P1 TX counters', '입력 오류와 PC 방향 송신의 동시 변화'],
      ['P2 BM_DRP / SWE_FILTERED', '스위치 내부 drop 발생 여부'],
      ['read_valid_mask / sample_rc', '해당 sample 신뢰 가능 여부']
    ],
    decision: 'FW tx는 정상인데 PC 수신만 낮고, P2 error/drop과 switch drop 징후가 같은 구간에 붙는다.'
  },
  stm: {
    title: 'STM32 / RMII / FW 송신',
    copy: 'DSP 데이터가 애초에 MCU에서 1000 Hz로 나가지 못했는지 분리한다. 이 경우 LiDAR 외부선보다 FW 송신 루프와 ETH TX 경로가 먼저다.',
    physicalTitle: 'LAN9354와 STM32 사이의 내부 길',
    physical: ['STM32 ETH MAC', 'RMII 신호선 / 직렬 저항', 'LAN9354 Port0', 'FW UDP 6001 송신', '6002 FW TX counter'],
    metrics: [
      ['6001 FW tx counter delta', 'FW 송신 시도 Hz'],
      ['ETH DMA / TX fail', 'HAL TX 실패와 DMA 오류'],
      ['Port0 방향 징후', 'STM32/RMII 쪽 이상 여부']
    ],
    decision: 'FW tx delta 자체가 낮거나 ETH TX/DMA fail이 증가하면 MCU 송신 경로 문제로 본다.'
  },
  pc: {
    title: 'PortA / PC 수신 경로',
    copy: '스위치가 PC 쪽으로는 정상 송신했는데 앱이나 OS/NIC에서 놓친 것인지 분리한다.',
    physicalTitle: 'LAN9354에서 외부 케이블로 나가는 길',
    physical: ['LAN9354 Port1/A', 'Control board PCB 경로', 'Molex board-to-board', 'Motor board / M12 쪽', 'LLC12_18M / 외부 PC 케이블'],
    metrics: [
      ['PHY A operational 100M', 'PC uplink 운용 상태'],
      ['P1 TX OK / error', 'PC 방향 송신과 오류'],
      ['Wireshark / socket errors', 'NIC 도착과 앱 수신 누락 분리']
    ],
    decision: 'LAN9354 P1 TX까지 정상이고 Wireshark에는 보이는데 앱 Hz만 낮으면 PC 수신/표시 문제다.'
  },
  ptp: {
    title: 'PTP Delay_Req / Delay_Resp 경로',
    copy: 'DSP Hz 문제와 별개로 시간동기 응답 경로가 막히는지 확인한다. PTP는 multicast/socket/L2 timestamp queue가 엮이므로 별도 카운터가 필요하다.',
    physicalTitle: 'PTP 응답이 만들어지는 논리 경로',
    physical: ['PC Delay_Req', 'LAN9354 Port1/A', 'STM32 Ethernet RX', 'timestamp queue pop', 'Delay_Resp 송신'],
    metrics: [
      ['Delay_Req L2 seen', 'PTP 요청 수신 여부'],
      ['TSQ count / overwrite', 'timestamp queue 밀림'],
      ['pop_ok / pop_miss / resp_fail', '응답 매칭과 송신 실패']
    ],
    decision: 'L2 seen은 증가하는데 pop_miss나 resp_fail이 붙으면 PTP 응답 경로를 DSP packet loss와 분리해서 본다.'
  }
};

const stage = document.querySelector('.stage');
const title = document.querySelector('#route-title');
const copy = document.querySelector('#route-copy');
const decision = document.querySelector('#route-decision');
const metrics = document.querySelector('#route-metrics');
const physicalTitle = document.querySelector('#physical-title');
const physicalPath = document.querySelector('#route-path');
const tabs = Array.from(document.querySelectorAll('.route-tabs button'));

function renderRoute(key) {
  const route = routes[key];
  if (!route) return;

  stage.dataset.activeRoute = key;
  title.textContent = route.title;
  copy.textContent = route.copy;
  decision.textContent = route.decision;
  physicalTitle.textContent = route.physicalTitle;
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
