# PortA first openEMS runs

These runners create new directories and retain the input, mesh, geometry, raw
voltage/current traces and complex frequency responses. They do not launch
browser calculations or infer CRC failures.

## Environment used

- Windows x64, Python 3.10.11 in an isolated virtual environment.
- Official openEMS 0.0.36 release, CSXCAD 0.6.3, matching CPython 3.10 wheels.
- numpy 1.26.4, scipy 1.15.3, h5py 3.14.0, matplotlib 3.10.6.
- Set the installation path per process through `--install`; no global PATH or
  existing Python environment is changed by the runners.

Official release:
https://github.com/thliebig/openEMS-Project/releases/tag/v0.0.36

Archive SHA-256:
`e0d62b1176c0897ad18876b45667de877d7d3b58b37c0be95545f9b988896059`

## Reference runs

`run_reference.py` reproduces the published microstrip notch geometry, then
removes the stub for a uniform-line check. The refinement variant has identical
physical dimensions and source feed distance. Each MSL port snaps its probes to
the grid; `align_reference.py` reprocesses the retained traces at identical
physical reference planes without another field solve.

The original 0.5–6 GHz phase-convergence check is retained even if it fails.
A separate 10–200 MHz check addresses the cable investigation band; passing
that check does not validate the GHz band or the cable's lumped ports.

## Cable runs

`run_cable.py` uses the reviewed `data/cable-spec.json` drawing facts. Its first
coupon has 120 mm of eight conductors, a 24 mm assumed common pitch, and 20 mm
test fanouts at both ends. All four signal wires and four power wires are
included. The `same` and `mixed` assignments share the cable interior geometry.
Their power-bus fanout connections necessarily differ and are part of the
response; this is a fixture-level A/B result, not a de-embedded cable matrix.

The six 100-ohm ports are, in order:

1. Ethernet pair 1, near end
2. Ethernet pair 2, near end
3. Power buses, near end, excited
4. Ethernet pair 1, far end
5. Ethernet pair 2, far end
6. Power buses, far end

Reported `Hdiff` is each far-end differential voltage divided by the **measured
power-port voltage**. It is not S21. Common-mode voltage uses two explicit
vertical voltage-integral paths to the finite reference plate. A separate
S-column and port-power sum are saved for consistency checks.

PP permittivity is initially 2.2; TPE permittivity is 2.5. Both are assumptions,
with loss set to zero. Copper and the single equivalent shield are PEC. This
does not represent the measured foil/braid contact or shielding transfer
impedance. Equal-area solid conductors do not reproduce strand AC losses.

The short broadband Gaussian pulse has f0=0, fc=500 MHz. The saved output band
is 10–200 MHz in 1 MHz increments. This changes the proposed long pulse while
keeping the intended output band. Every result uses actual input normalization.

Wire centerlines are piecewise straight with axial segments no longer than
1 mm. Consecutive chunks share an endpoint and their overlapping solid unions
represent the same polyline wire. Chunking accelerates geometry lookup without
changing the specified wire path. Continuous metal clearances are checked
before material assignment; this is not a substitute for grid convergence.

## Evidence and validation

- `input.json` is the pre-run configuration, so its `solverRun` remains false.
  `response.json` is written only after a field run and successful processing.
- Completion at the timestep cap is not convergence. Inspect the final energy
  and the configured termination criterion.
- Preserve both grid results and differences; do not smooth numerical failures.
- `publish_initial.py` packages completed data and evidence hashes, keeping raw
  execution directories outside the report tree. It rejects machine paths in
  logs intended for the static report.
- A two-grid change is an uncertainty indicator, not a certified error bound.
  Boundary/port placement, pitch/phase and material sensitivities remain
  separate validation tasks.
- `check_time_windows.py` repeats the DFT using the first 80% and 90% of the
  recorded time samples. This checks sensitivity to cutting off the saved tail;
  it is not a longer field run, a stricter end-energy run, or a mesh comparison.
- Grid-cell counts in input metadata count intervals. The solver's size message
  counts the product of grid-line counts; these two conventions differ.
- Initial cable runs may be deliberately stopped after an 8 ns diagnostic
  observation window using the official ABORT-file interface. The pulse lasts
  about 5.73 ns. This preserves samples for inspection of the slow residual tail;
  it does not waive or pass the original 1e-5 energy criterion. Any such stop is
  recorded separately in `diagnostic-stop.json`, and requires a longer run before
  an energy-convergence claim.
  The native engine also prints a generic maximum-timestep warning after an
  ABORT stop. The recorded iteration count and diagnostic-stop note distinguish
  that operation from reaching the configured 160,000-step cap.
- `align_observation_window.py` selects the same first 8 ns of real V/I samples
  in each case, so differing flush times do not change the A/B observation
  window. No interpolation or extrapolation is used. The published
  `response.json` and `response.npz` contain this common-window response;
  `full-window-response.json` and `.npz` retain the original postprocessing.

The reference recipe is adapted from Thorsten Liebig's openEMS example. The
upstream GPL v3 text is retained in `COPYING-openEMS.txt`.
