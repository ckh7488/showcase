# PortA laboratory configuration review

Revision 03 reflects the user's 2026-09-13 corrections. This is a topology and geometry review, not a completed openEMS analysis.

- One approximately 20 m, eight-conductor cable carries two Ethernet twisted pairs, a +24 V/+24 V twisted pair, and a 0 V/0 V twisted pair. All eight wires terminate at one sensor M12.
- The non-sensor-end breakout is physically near the SMPS. Its four power leads to the SMPS are short; the commercial Ethernet cable from the plastic RJ45/passive coupler to the PC is comparatively long. Exact lengths remain unspecified.
- A braid shield is present and unconnected at both ends. Its material, coverage and end geometry remain unknown.
- MEAN WELL LRS-350-24 has L/N/FG connected to the three-wire mains cord. Output 0 V to FG extra bonding is unconfirmed. Manufacturer envelope: 215 x 115 x 30 mm. Manufacturer FG-to-chassis continuity evidence is distinct from an actual unit or table measurement.
- The anodized sensor and SMPS sit directly on the same steel test table. No deliberate table bonding wire was installed. Surface contact impedances and incidental earthing are unconfirmed.
- PC and monitor share strip A; SMPS uses strip B on another outlet.
- Room dimensions, branching lead lengths, coil geometry and the enlarged cable pair illustration are display-only. They are not solver mesh or numeric inputs.
- Sensor mechanics retain the prior ATLAS approximation and PCB geometry retains the manufacturing source. Part XY is sourced; body heights and mechanical contacts are approximations.
- The map keeps confirmed wiring, ATLAS references, unverified bonds, and coupling hypotheses distinct. Prior results are not promoted to new EMC results.
- Source hashes are in data/provenance.json; physical facts and unresolved values are in data/model-inputs.json. Three.js r128 is locally bundled with MIT license.
- Existing browser review notes are retained and can be exported against the current revision; they do not constitute solver approval.
