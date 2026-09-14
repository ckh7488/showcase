# EMC 기본 구조

Imported from the user-supplied HTML lesson (2026-09-12), integrated on 2026-09-13.
Original SHA-256: `f79b95fc38ae0c3e9d747d1c800a7b597f3f06a33c5ea1762b71849e0df72a25`.

`data.js` preserves all 13 supplied result records, metadata, fields, profiles,
approximations and validation notes. No solver was rerun during integration.
The uploaded result provenance is described by the source; solver input files
and full execution logs were not supplied. These are educational PEC/air models,
not measured results or an EMC pass/fail assessment of PALA720.

Case 05 uses a 1 V RMS open-circuit Thevenin source with Rs = 50 ohms.
It compares 40 mm / 1 kohm, 120 mm / 1 kohm and 120 mm / 50 ohms.
The source voltage is not the input-port voltage. The 50 ohm load is not claimed
to match the line. Frequency selection snaps to stored samples; field slices
remain fixed at the recorded frequency. Profile bars show voltage magnitudes,
not phase or a time-domain wave shape.

Three.js r160 is bundled under MIT; see `vendor/LICENSE-three.txt`.
Changes: ATLAS theme/navigation, clearer transition into case 05, accessible
camera controls, WebGL fallback/restoration and a concise data provenance note.
