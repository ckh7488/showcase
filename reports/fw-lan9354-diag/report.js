const routes = {
  lidar: {
    title: 'LiDAR 입력 · Port B',
    copy: '케이블이나 포트 상태가 나쁘면 연결은 유지돼도 수신 오류가 늘 수 있다.',
    physicalTitle: 'LiDAR에서 LAN9354로 들어오는 길',
    physical: ['LiDAR', 'LiDAR 쪽 케이블', '슬립링 케이블', '제어보드 커넥터', 'LAN9354 Port B'],
    metrics: [
      ['PHY B operational 100M', 'Port B가 100 Mbps로 동작하는지'],
      ['P2 RX CRC / ALIGN / SYMBOL', 'LiDAR 입력의 프레임 오류'],
      ['P2 BM_DRP / BM_RATE_DRP', 'Port B 입력이 버려진 수']
    ],
    decision: 'Port B가 100 Mbps로 동작하지 않거나 수신 오류가 늘면 LiDAR 쪽 케이블과 포트부터 본다.'
  },
  fabric: {
    title: '스위치 내부 · 전달과 폐기',
    copy: 'Port B 입력이 공용 버퍼를 압박하면 STM32에서 PC로 가는 패킷도 영향을 받을 수 있다.',
    physicalTitle: 'Port B 입력이 다른 경로에 영향을 주는 과정',
    physical: ['LAN9354 Port B', '공용 버퍼', '스위치 내부 폐기', 'Port 0에서 Port A로 가는 패킷에 영향'],
    metrics: [
      ['P2 RX → P1 TX counters', '프레임 크기별 받은 수와 보낸 수'],
      ['P2 BM_DRP / SWE_FILTERED', '버퍼 또는 필터에서 버려진 수'],
      ['read_valid_mask / sample_rc', '카운터를 정상적으로 읽었는지']
    ],
    decision: '프레임 크기별 입·출구 증가량이 벌어지고 폐기 카운터도 늘면 스위치 내부부터 본다.'
  },
  stm: {
    title: 'STM32 송신 · Port 0',
    copy: 'STM32가 DSP 데이터를 기준 송신률인 1,000 Hz로 내보내는지 확인한다.',
    physicalTitle: 'LAN9354와 STM32 사이의 내부 길',
    physical: ['STM32 ETH MAC', 'RMII 신호선 / 직렬 저항', 'LAN9354 Port 0'],
    metrics: [
      ['g_legacy_send_count', '펌웨어의 UDP 6001 송신 성공 횟수'],
      ['ETH DMA / TX fail', '송신 실패와 DMA 오류'],
      ['Port 0 상태', 'STM32와 스위치 사이의 이상 징후']
    ],
    decision: '펌웨어의 송신 빈도가 낮아지거나 ETH TX·DMA 오류가 늘면 STM32 송신 경로부터 본다.'
  },
  pc: {
    title: 'PC 수신 · Port A',
    copy: '스위치가 PC 방향으로 내보낸 프레임을 PC 캡처와 앱에서 각각 확인한다.',
    physicalTitle: 'LAN9354에서 외부 케이블로 나가는 길',
    physical: ['LAN9354 Port A', '제어보드 PCB 경로', 'Molex 보드 간 커넥터', '모터보드 / M12 쪽', 'LLC12_18M / 외부 PC 케이블'],
    metrics: [
      ['PHY A operational 100M', 'Port A가 100 Mbps로 동작하는지'],
      ['P1 TX OK', 'PC 방향으로 송신한 프레임 수'],
      ['PC 캡처 / 소켓 오류', 'PC에 들어온 것과 앱이 받은 것 비교']
    ],
    decision: 'Port A 송신이 유지되면 PC 캡처와 수신 카운터를 대조해 패킷이 어디까지 왔는지 본다.'
  }
};

const stage = document.querySelector('.stage');
const overview = document.querySelector('#route-overview');
const inspector = document.querySelector('.route-inspector');
const title = document.querySelector('#route-title');
const copy = document.querySelector('#route-copy');
const decision = document.querySelector('#route-decision');
const metrics = document.querySelector('#route-metrics');
const physicalTitle = document.querySelector('#physical-title');
const physicalPath = document.querySelector('#route-path');
const routePanel = document.querySelector('#route-panel');
const tabs = Array.from(document.querySelectorAll('.route-tabs button'));

function renderRoute(key) {
  const route = routes[key];
  if (!route && key !== 'overview') return;

  stage.dataset.activeRoute = key;
  overview.hidden = Boolean(route);
  inspector.hidden = !route;

  if (route) {
    title.textContent = route.title;
    copy.textContent = route.copy;
    decision.textContent = route.decision;
    physicalTitle.textContent = route.physicalTitle;
    physicalPath.innerHTML = route.physical.map((item) => `<li>${item}</li>`).join('');
    metrics.innerHTML = route.metrics.map(([name, text]) => (
      `<div class="metric"><b>${name}</b><span>${text}</span></div>`
    )).join('');
  }

  tabs.forEach((button) => {
    const active = button.dataset.route === key;
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
    if (active) routePanel.setAttribute('aria-labelledby', button.id);
  });
}

tabs.forEach((button, index) => {
  button.addEventListener('click', () => renderRoute(button.dataset.route));
  button.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    renderRoute(next.dataset.route);
    next.focus();
  });
});

renderRoute('overview');
