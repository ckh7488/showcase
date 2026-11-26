const sequence = (prefix, count) => Array.from({ length: count }, (_, index) => prefix + (index + 1));
const hub = ["HubHolder", "HubPCB", ...sequence("HubBolt", 4), ...sequence("HubBodyJ", 8),
  "HubBodyF1", "HubBodyF2", "HubBodyC1", "HubBodyC2", ...sequence("HubPlugJ", 8).slice(2),
  "A4J1FemaleEnvelope", "A4J1CupGroundEnvelope", "A4J1CupPositiveEnvelope",
  "A4J2FemaleEnvelope", "A4J2CupGroundEnvelope", "A4J2CupPositiveEnvelope", "A4J2LeverKeeper"];
const base = ["Part000", "Part002", "CableSaddle", "CableGate", "ServiceHatchNutKeeperLeft", "ServiceHatchNutKeeperRight"];
const inletBolts = [...sequence("A4InletBolt", 2), ...sequence("A4InletInsert", 2)];
const stationBolts = sequence("A4StationFastener", 8);
const stationWires = ["A4W6", "A4W7", "A4W35", "A4W36", "A4W6SupplyCup", "A4W7SupplyCup",
  "A4W35SocketCup", "A4W36SocketCup"];
const rearShell = ["Part029", "RearSkullScrewLeft", "RearSkullScrewRight", "RearSkullNutLeft", "RearSkullNutRight"];
const jawFasteners = ["JawExteriorScrewLeft", "JawExteriorScrewRight", "JawAntiRockScrew", "JawExteriorInsertLeft",
  "JawExteriorInsertRight", "JawAntiRockInsert"];
const cameraWires = ["EatonCableNeutral", "RearLead3_1", "CameraUSB", "EatonRearStationarySplice",
  "CameraEatonHeadFixedLeg", "CameraEatonHeadSplice", "CameraEatonHeadTie", "CameraOEMHeadTail"];
const cameraBody = ["Part007", "Part010", "Part011", "Part017", "Part018", "Part065", "Part066", "Part067",
  "Part024", "Jaw_30_moving_jaw", "Jaw_36_left_jaw_servo_stay", "Jaw_37_right_jaw_bearing_stay"];
const unique = array => [...new Set(array)];

export const partGroups = {
  power: unique([...base, ...hub, ...inletBolts, ...stationBolts, ...stationWires, "SupplyXT30", "InputXT30",
    "InputXT60Mate", "InputXT60", "A4WagoPositive", "A4WagoGround", "A4XT60ExternalSocket", "A4XT60ExternalMate"]),
  hub: unique([...base, ...hub, "SupplyXT30", "InputXT30", "RearLead1_1", "RearLead1_2"]),
  camera: unique([...base, ...cameraBody, ...cameraWires]),
  fasteners: unique([...base, ...hub, ...inletBolts, ...stationBolts, ...rearShell, ...jawFasteners, ...cameraBody,
    "InputXT60Mate", "A4XT60ExternalSocket", "ServiceHatchNutKeeperLeftScrew", "ServiceHatchNutKeeperRightScrew",
    "ServiceHatchNutKeeperLeftScrewInsert", "ServiceHatchNutKeeperRightScrewInsert"]),
};

export const fastenerViews = {
  keeper: { target: [0, 63, -70], eye: [69, 117, 35], parts: ["A4J2LeverKeeper", ...sequence("HubBolt", 4), "A4J2FemaleEnvelope", "HubBodyJ1", "HubBodyJ2", "HubPCB", "HubHolder"] },
  inlet: { target: [-13, 172, -57], eye: [40, 94, 43], parts: ["InputXT60Mate", "CableSaddle", "CableGate", ...inletBolts] },
  socket: { target: [12, 186, -75], eye: [64, 100, 21], parts: ["A4XT60ExternalSocket", "CableSaddle", ...stationBolts] },
  hatch: { target: [0, 65, -78], eye: [68, 100, -38], parts: ["Part000", "HubHolder", "ServiceHatchNutKeeperLeft", "ServiceHatchNutKeeperRight",
    "ServiceHatchNutKeeperLeftScrew", "ServiceHatchNutKeeperRightScrew", "ServiceHatchNutKeeperLeftScrewInsert", "ServiceHatchNutKeeperRightScrewInsert"] },
  rear: { target: [0, 26, 119], eye: [43, 183, 33], parts: [...rearShell, "Part024"] },
  jaw: { target: [1, -3, 99], eye: [112, -4, 59], parts: [...jawFasteners, "Part024", "Jaw_30_moving_jaw", "Jaw_36_left_jaw_servo_stay", "Jaw_37_right_jaw_bearing_stay"] },
};

const colors = {
  base: 0x8399a5, shell: 0xaabdcc, bracket: 0x6e8c9a, board: 0x419b78, insulated: 0xd6a958,
  plus: 0xff805c, ground: 0x8babfa, usb: 0x54dbd2, hardware: 0xd7dbe2, insert: 0xf4bf64,
  keeper: 0xb1d76e, wago: 0xf6a559,
};

export function partColor(id) {
  if (/^(A4W(?:6|35)(?:\D|$)|RearLead1_1)/.test(id)) return colors.plus;
  if (/^(A4W(?:7|36)(?:\D|$)|RearLead1_2)/.test(id)) return colors.ground;
  if (id.includes("CupPositive")) return colors.plus;
  if (id.includes("CupGround")) return colors.ground;
  if (id.startsWith("A4Wago")) return colors.wago;
  if (cameraWires.includes(id)) return colors.usb;
  if (id.includes("Insert")) return colors.insert;
  if (/Bolt|Screw|Nut|Washer|Fastener/.test(id)) return colors.hardware;
  if (id === "A4J2LeverKeeper") return colors.keeper;
  if (/XT[36]0|FemaleEnvelope|HubBodyJ|HubPlugJ/.test(id)) return colors.insulated;
  if (id === "HubPCB") return colors.board;
  if (id === "Part029") return colors.shell;
  return id === "Part000" || id === "Part002" ? colors.base : colors.bracket;
}

export const cameraViews = {
  overview: { target: [12, 53, 7], eye: [262, 373, 207] },
  head: { target: [7, -22, 83], eye: [86, -34, 53] },
  rear: { target: [67, 140, -48], eye: [180, 112, 73] },
};
