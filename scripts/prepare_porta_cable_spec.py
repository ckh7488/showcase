"""Preserve visually reviewed cable drawing facts, units and modeling assumptions.

Usage: python scripts/prepare_porta_cable_spec.py <source-pdf>
The source PDF stays in its original location; only facts and its hash are saved.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

source = Path(sys.argv[1])
out = Path(__file__).resolve().parents[1] / 'reports/porta-test-plan/data'
mm = lambda inch: round(inch * 25.4, 6)
area = 19 * math.pi * (mm(.005) / 2) ** 2
spec = {
    'revision': 'cable-drawing-01',
    'reviewed': '2026-09-13',
    'solverRun': False,
    'source': {
        'filename': source.name,
        'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'pages': 3,
        'review': 'All three pages visually inspected; embedded text encoding is defective.',
        'originalPdfCopied': False,
    },
    'identity': {
        'userLabel': 'FM-CAB001',
        'manufacturer': 'Northwire',
        'partNumber': 'FAWM248-076',
        'drawingNumber': '47674-1',
        'drawingRevision': 'C',
        'revisionDate': '2014-04-10',
        'printedLegend': 'NorthwireVISION GEV-1000 24 AWG /8',
        'userConfirmedAsUsed': True,
        'length_m': 20,
        'lengthEvidence': 'User confirmation; the drawing is a bulk cable specification, not a 20 m assembly drawing.',
    },
    'drawingFacts': {
        'conductors': {'count': 8, 'pairs': 4, 'awg': 24, 'strands': 19,
            'strandDiameter_in': .005, 'strandDiameter_mm': mm(.005),
            'material': 'tinned copper', 'construction': 'unilay', 'page': 2},
        'insulation': {'material': 'polypropylene', 'thickness_mil': 8,
            'thickness_mm': mm(.008), 'minimumThickness_mil': 6.5,
            'minimumThickness_mm': mm(.0065), 'outerDiameter_in': .040,
            'outerDiameterTolerance_in': .001, 'outerDiameter_mm': mm(.040),
            'outerDiameterTolerance_mm': mm(.001), 'page': 2},
        'pairEnvelope': {'width_in': .080, 'tolerance_in': .004,
            'width_mm': mm(.080), 'tolerance_mm': mm(.004),
            'isTwistPitch': False, 'page': 2},
        'wrap': {'material': 'spun nylon tape', 'page': 1},
        'foil': {'material': 'aluminum Mylar foil shield',
            'thickness_mm': None, 'overlap': None, 'conductiveFace': None, 'page': 1},
        'braid': {'material': 'tinned copper', 'strandAWG': 36,
            'minimumCoverage_percent': 85, 'angle_deg': None,
            'transferImpedance_ohm_per_m': None, 'page': 1},
        'jacket': {'material': 'TPE', 'color': 'green', 'thickness_mil': 30,
            'thickness_mm': mm(.030), 'minimumThickness_mil': 24,
            'minimumThickness_mm': mm(.024), 'outerDiameter_in': .265,
            'outerDiameterTolerance_in': .010, 'outerDiameter_mm': mm(.265),
            'outerDiameterTolerance_mm': mm(.010), 'page': 1},
        'coreDimensions': {'horizontal_in': .185, 'vertical_in': .205,
            'toleranceEach_in': .010, 'horizontal_mm': mm(.185),
            'vertical_mm': mm(.205), 'toleranceEach_mm': mm(.010),
            'note': 'Core dimensions for internal use only; retain as drawn directions, not two independently specified shield diameters.', 'page': 1},
        'characteristicImpedance': {'nominal_ohm': 100, 'tolerance_ohm': 15,
            'frequencyRange_Hz': None, 'testMethod': None,
            'note': 'Drawing requirement, not a measured impedance, terminal resistor or all-frequency SI/EMC pass.', 'page': 3},
        'pairColors': [['green', 'white/green'], ['brown', 'white/brown'],
            ['blue', 'white/blue'], ['orange', 'white/orange']],
        'colorPositionNote': 'Drawing says color rotation will vary on pairs; the reference illustration does not establish actual longitudinal positions or functional pin assignments.',
    },
    'userWiring': {
        'ethernetPairs': 2, 'powerPairs': [['+24V', '+24V'], ['0V', '0V']],
        'shieldEndBonds': [False, False],
        'foilToBraidContact': 'not verified',
        'colorToFunction': None, 'm12PinMap': None,
        'note': 'User confirmation establishes wiring topology; the bulk cable drawing does not specify M12/RJ45 assembly pin mapping.',
    },
    'derived': {
        'copperAreaPerConductor_mm2': area,
        'equalAreaSolidDiameter_mm': math.sqrt(19) * mm(.005),
        'note': 'Area from 19 circular 0.005 in strands. Equal-area diameter is a modeling option, not the measured stranded bundle diameter or an AC loss model.',
    },
    'displayModel': {
        'status': 'explanatory geometry, not an executable solver mesh',
        'conductorRadius_mm': math.sqrt(19) * mm(.005) / 2,
        'insulationRadius_mm': mm(.040) / 2,
        'pairHelixRadius_mm': mm(.040) / 2,
        'pairCenters_yz_mm': [[-1.02, -1.02], [-1.02, 1.02], [1.02, -1.02], [1.02, 1.02]],
        'foilRadius_mm': 2.55,
        'braidRadius_mm': mm(.205) / 2,
        'jacketRadius_mm': mm(.265) / 2,
        'assumptions': ['Fixed square pair centers and equal twist pitch/phase are illustrative.',
            'Circular shield envelopes and the separated foil/braid surfaces are approximations; no foil thickness is implied.',
            'The jacket is shown only at one end to reveal the inside.',
            'Wire colors identify function in this viewer, not verified cable color-to-pin mapping.'],
    },
    'remainingUnknowns': ['individual pair twist pitches and relative phases',
        'overall cable lay and pair position changes along length',
        'frequency-dependent permittivity and loss of PP/Mylar/TPE',
        'foil thickness, overlap and electrical contact to braid',
        'braid angle, carriers, thickness and transfer impedance',
        'actual color-to-function and M12/RJ45 pin maps',
        'breakout untwist lengths and terminations',
        'source/load impedances and actual noise spectrum'],
    'modelDecision': {
        'use': 'Replace unspecified cable construction with this drawing and sweep remaining unknowns.',
        'shield': 'Represent foil plus braid. An initial single equivalent shield is an explicit approximation; test foil/braid contact and finite shield behavior before claiming shielding performance.',
        'pitch': 'Keep 24 mm as an assumed starting value; 0.080 in is NOT a pitch.',
        'impedance': 'Use the 100 +/- 15 ohm drawing requirement as a consistency check; the unspecified test band prevents an all-frequency acceptance claim.',
    },
}
out.mkdir(parents=True, exist_ok=True)
(out / 'cable-spec.json').write_text(json.dumps(spec, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
(out / 'cable-spec.js').write_text('const CABLE_SPEC = ' + json.dumps(spec, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print('Prepared reviewed cable facts, conversions and separate assumptions; no simulation run.')
