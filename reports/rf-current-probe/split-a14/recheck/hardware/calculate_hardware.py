"""Dimensional sensitivity, not a physical load/torque test. Python 3, stdlib only."""
from pathlib import Path
import hashlib
import json
import math

OUT = Path(__file__).resolve().parent
cases = [
    ("upper_old_25", 25.0, 0.5, 20.0),
    ("upper_recommended_30", 30.0, 0.5, 20.0),
    ("lower_retained_30", 30.0, 0.5, 22.0),
    ("base_old_16", 16.0, 0.4, 10.0),
    ("base_reversed_recommended_20", 20.0, 0.5, 10.0),
]
results = []
for name, length, length_tol, grip in cases:
    nominal = length - grip - 2 * 0.8 - 3.2
    sensitivity = length - length_tol - (grip + 0.6) - 2 * 0.9 - 3.2
    results.append({
        "case": name, "length_mm": length, "length_tolerance_mm": length_tol,
        "grip_mm": grip, "projection_nominal_mm": round(nominal, 3),
        "projection_sensitivity_min_mm": round(sensitivity, 3),
        "projection_after_one_pitch_screen_mm": round(sensitivity - 0.7, 3),
    })

payload = {
    "status": "CALCULATED — not assembly, fatigue, torque, or RF certification",
    "date": "2026-09-21",
    "verified_specs": {
        "M4_pitch_mm": 0.7,
        "Essentra_50P_M4_head_diameter_mm": [7.6, 8.0],
        "Essentra_50P_M4_head_height_mm": [2.8, 3.1],
        "Essentra_04M040070HNDIN34814_nut_AF_mm": [6.8, 7.0],
        "Essentra_04M040070HNDIN34814_nut_height_mm": [2.9, 3.2],
        "Essentra_17M04DIN34815_washer_nominal_ID_OD_thickness_mm": [4.3, 9.0, 0.8],
        "Micro_Plastics_50P_length_tolerance_source": "PDF page 154: all tolerances are plus and minus; >10..16 +/-0.4; >16..50 +/-0.5. Historical manufacturer source, not a current-lot certificate.",
    },
    "sensitivity_assumptions_not_manufacturer_guarantees": {
        "grip_increase_mm": 0.6,
        "each_washer_thickness_mm": [0.7, 0.9],
        "pocket_depth_loss_mm": 0.6,
        "one_pitch_tip_screen_mm": 0.7,
        "notes": "Washer thickness tolerance and maximum incomplete end-thread length not published in archived sources. Local print +/-0.3 per dimension is a sensitivity input, not whole-part warp certification.",
    },
    "joint_projections": results,
    "base_reversed": {
        "shank_y_mm": [-82.8, -62.8], "nut_y_mm": [-71.2, -68.0],
        "head_lowest_y_max_head_mm": -85.9, "bench_y_mm": -88.0,
        "head_floor_clearance_nominal_mm": 2.1,
        "head_floor_clearance_sensitivity_min_mm": round(6 - .6 - .9 - 3.1, 3),
    },
    "washer_effective_annulus_over_5p4_hole_mm2": {
        "new_OD9": round(math.pi / 4 * (9**2 - 5.4**2), 3),
        "old_OD10": round(math.pi / 4 * (10**2 - 5.4**2), 3),
        "caution": "Area only. No preload/creep/load capacity inferred.",
    },
    "C07_no_press_fit_candidate": {
        "knob": "GN 6336.2-32-M6-E", "shaft": "Wurth 095496120 M6x120 DIN976-1 A2-70",
        "jam_nut": "Fabory 51080.060.001 DIN934 M6 AF10 H5",
        "upper_washer": "Fabory 50060.060.001 brass DIN125-1A M6 ID6.4 OD12 t1.6",
        "axis_x_z_mm": [80, 26], "washer_y_mm": [50, 51.6],
        "jam_y_mm": [51.6, 56.6], "knob_y_mm": [56.6, 76.6],
        "knob_envelope_diameter_mm": 32, "knob_height_mm": 20,
        "knob_bushing_diameter_mm": 12, "knob_min_thread_depth_mm": 12,
        "shaft_insertion_into_knob_mm": 10, "shaft_y_mm": [-53.4, 66.6],
        "old_knob_envelope_mm": [28, 12],
        "old_knob_y_mm": [50, 62],
        "nominal_tip_beyond_lowest_drive_nut_face_mm": 15.9,
        "note": "A candidate for root integration. No edits to C07/native made by this report. 10mm insertion is assembly setting, not a blind-bottom stop. Bidirectional jam-lock proof remains physical validation.",
    },
}
(OUT / "hardware_calculations.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
manifest = {
    "date": "2026-09-21", "files": {
        p.name: {"sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "bytes": p.stat().st_size}
        for p in sorted(OUT.glob("*.pdf"))
    },
    "sources": [
        {"file": "essentra_fasteners_manufacturer.pdf", "url": "https://essentracomponents.bynder.com/m/6e2e9b888468b393/original/2685970-pdf.pdf", "pages_1_based": [35, 72, 86], "authorship": "Essentra Components"},
        {"file": "micro_plastics_manufacturer_catalog.pdf", "url": "https://www.farnell.com/datasheets/3153494.pdf", "pages_1_based": [154], "authorship": "Micro Plastics Inc.; distributor-hosted manufacturer catalogue, predecessor 50P series"},
        {"file": "ganter_GN6336_2_manufacturer.pdf", "url": "https://live-katalog.ganternorm.com/pdf/ganter/en/6336_1.pdf?dispositiontype=attachment", "pages_1_based": [1], "authorship": "Otto Ganter"},
    ],
}
(OUT / "source_manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"calculations": len(results), "archived_pdf_count": len(manifest["files"]), "minimum_updated_projection_mm": min(r["projection_sensitivity_min_mm"] for r in results if "old" not in r["case"])}, indent=2))
