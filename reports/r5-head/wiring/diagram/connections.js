const point = (label, part, pin) => ({ label, part, pin });
const row = (wire, signal, from, to, color, detail) => ({ wire, signal, from, to, color, detail });
const unit = (id, circuit, title, count, rows, note) => ({ id, circuit, title, count, rows, note });
const wago = (label, size = 3) => point(label, `wago-221-41${size}`, "레버");
const fuse = pin => point("턱 2 A 퓨즈", "littelfuse-0fhm", pin);
const gnd5 = wago("5 V GND 분기");
const data = wago("DATA 분기");
const pos5 = wago("+5 V 분기");
const gnd12 = wago("12 V GND 분기", 2);
const pos12 = wago("+12 V 분기", 2);
const pad = (label, pin) => point(label, "xt30u-f", pin);
const ph = (label, pin, part = "phr-3") => point(label, part, pin);
const eh = (label, pin) => point(label, "ehr-3", pin);
const usbA = pin => point("PC 쪽 USB-A", "usb-a", pin);
const cam = pin => point("U20CAM 키 플러그", "u20cam-board", pin);

function motor(id, name, port, first, voltage, note = "") {
  const hub = voltage === 5 ? ph : eh;
  const end = `ID${id} ${name}`;
  return unit(`id${id}`, "motors", `${port} ↔ ${end}`, "3가닥", [
    row(`W${first}`, "GND", hub(port, "1"), eh(end, "1")),
    row(`W${first + 1}`, `+${voltage} V`, hub(port, "2"), eh(end, "2")),
    row(`W${first + 2}`, "DATA", id === 3 ? data : hub(port, "3"), eh(end, "3")),
  ], note);
}

export const harnesses = [
  unit("openrb", "control", "OpenRB-150 ↔ A5 J3", "2가닥 / EH 3칸", [
    row("W10", "GND", eh("OpenRB EH", "1"), ph("A5 J3", "1", "phr-2")),
    row(null, "VDD 미사용", eh("OpenRB EH", "2"), null, null, "OpenRB EH 2번에는 전선과 금속 압착 단자를 모두 넣지 않습니다."),
    row("W11", "DATA", eh("OpenRB EH", "3"), ph("A5 J3", "2", "phr-2")),
  ], "OpenRB 점퍼는 USB(VIN) 쪽에 두고 나사식 VIN을 비웁니다. 165 mm는 덮개를 30 mm 내린 가조립에서 확정합니다."),
  unit("5v-tail", "power5", "5 V 어댑터 꼬리", "2가닥", [
    row("W33", "+5 V", point("5 V 어댑터 DC 출력", null, "+"), point("5 V 어댑터 플러그", "xt30u-f", "+")),
    row("W34", "GND", point("5 V 어댑터 DC 출력", null, "−"), point("5 V 어댑터 플러그", "xt30u-f", "−")),
  ], "어댑터의 실제 출력 전압과 극성을 먼저 확인합니다."),
  unit("5v-in", "power5", "받침 5 V IN ↔ 분기", "2가닥", [
    row("W1", "+5 V", point("받침 5 V IN", "xt30u-m", "+"), pos5),
    row("W2", "GND", point("받침 5 V IN", "xt30u-m", "−"), gnd5),
  ], "같은 레버 블록의 구멍은 내부에서 모두 연결됩니다. +5 V와 GND에는 블록을 하나씩 따로 씁니다."),
  unit("j1", "power5", "5 V 분기 ↔ 허브 J1", "2가닥", [
    row("W3", "+5 V", pos5, pad("A5 J1 패드", "2")),
    row("W4", "GND", gnd5, pad("A5 J1 패드", "1")),
  ], "양끝에 J1 · 5 V 라벨을 붙입니다. 안쪽 J1과 J2는 같은 XT30 외형입니다."),
  unit("jaw-fuse", "power5", "5 V 분기 ↔ 턱 퓨즈 입력", "1가닥", [
    row("W5", "+5 V", pos5, fuse("입력")),
  ], "홀더의 순정 리드에 납땜하고 열수축합니다. 퓨즈 출력부터 ID6까지는 W29입니다."),
  unit("12v-in", "power12", "받침 12 V IN ↔ 분기", "2가닥", [
    row("W6", "+12 V", point("받침 12 V IN", "xt60u-m", "+"), pos12),
    row("W7", "GND", point("받침 12 V IN", "xt60u-m", "−"), gnd12),
  ], "12 V 어댑터 출력 리드에는 XT60U-F 한 개를 사용합니다. 멀티미터로 출력 극성을 확인하고 AC에서 분리한 뒤 +를 빨간 표식, −를 검정 표식으로 구분합니다. XT60U-F의 몰드 표시대로 납땜하고 컵을 각각 절연합니다. 이 플러그는 받침의 12 V IN XT60U-M에 결합합니다. W6·W7은 받침 쪽 재단선입니다. +12 V와 GND에는 WAGO 221-412를 하나씩 따로 씁니다."),
  unit("12v-service", "power12", "12 V 분기 ↔ 뒤 고정 소켓", "2가닥", [
    row("W35", "+12 V", pos12, point("12 V SERVICE 고정", "xt60e-f", "+")),
    row("W36", "GND", gnd12, point("12 V SERVICE 고정", "xt60e-f", "−")),
  ], "받침 뒤 고정 소켓에 12 V SERVICE 라벨을 붙여 12 V IN과 구분합니다."),
  unit("j2", "power12", "12 V SERVICE ↔ 허브 J2", "2가닥", [
    row("W8", "+12 V", point("12 V SERVICE 가동", "xt60u-m", "+"), pad("A5 J2 패드", "2")),
    row("W9", "GND", point("12 V SERVICE 가동", "xt60u-m", "−"), pad("A5 J2 패드", "1")),
  ], "양끝에 J2 · 12 V 라벨을 붙입니다. 컵을 각각 열수축하고, 무전원에서 극성과 입력 도통을 확인하고, 첫 통전 전 J2 잠금쇠를 고정합니다."),
  motor(1, "눈 좌우", "A5 J4", 13, 5),
  motor(2, "눈 상하", "A5 J5", 16, 5),
  motor(3, "눈꺼풀", "A5 J6", 19, 5, "눈꺼풀의 DATA W21은 DATA WAGO에서 옵니다. J6의 3번은 W12로 같은 블록에 연결합니다."),
  unit("j6-data", "motors", "A5 J6 ↔ DATA 분기", "1가닥", [
    row("W12", "DATA", ph("A5 J6", "3"), data),
  ], "같은 DATA WAGO에 W21(눈꺼풀)과 W30(턱)을 넣습니다."),
  motor(4, "목 좌우", "A5 J7", 22, 12, "덮개를 내린 상태에서 확인합니다. 두 플러그를 포함한 완성 길이는 120 mm 이하입니다."),
  motor(5, "목 상하", "A5 J8", 25, 12),
  unit("id6", "motors", "분기 ↔ ID6 턱", "3가닥", [
    row("W28", "GND", gnd5, eh("ID6 턱", "1")),
    row("W29", "+5 V", fuse("출력"), eh("ID6 턱", "2")),
    row("W30", "DATA", data, eh("ID6 턱", "3")),
  ], "세 선은 모터에서 한 플러그로 모이고, 받침 쪽에서는 서로 다른 세 지점에 연결합니다."),
  unit("camera", "usb", "PC ↔ U20CAM 카메라", "1케이블 / 4회로", [
    row("W31", "VBUS +5 V", usbA("1"), cam("도통"), "빨강"),
    row("W31", "D−", usbA("2"), cam("도통"), "흰색"),
    row("W31", "D+", usbA("3"), cam("도통"), "초록"),
    row("W31", "GND", usbA("4"), cam("도통"), "검정"),
  ], "표의 색은 두 접합부의 식별 라벨입니다. 절단 전에 순정 양끝과 선재를 도통으로 매핑합니다. 고정점 사이 550 mm, 굽힘 R18 이상, 외경 3.00 mm 이하로 배치합니다. 두 접합은 고정점 밖에 두고 D+/D−의 꼬임을 유지합니다. 실드는 순정 상태를 확인하고 VBUS와 단락이 없는지 검사합니다."),
  unit("usb-openrb", "usb", "PC ↔ OpenRB USB", "1케이블 / 완제품", [
    row("W32", "USB 데이터·전원", usbA("USB-A"), point("OpenRB", "usb-c", "USB-C")),
  ], "약 30 cm USB 데이터 케이블을 그대로 사용합니다. OpenRB와 카메라는 각각 별도의 USB-A 연장선으로 PC에 연결합니다."),
];
