"""Recalculate the three reported intervals from the public timing excerpt."""

from csv import DictReader
from pathlib import Path


def main():
    with Path(__file__).with_name("timing.csv").open(encoding="utf-8", newline="") as file:
        packets = list(DictReader(file))

    segments = [packet["segment"] for packet in packets]
    if segments != ["before"] + ["burst"] * 37 + ["after"]:
        raise SystemExit("Expected 1 packet before, 37 in the burst, and 1 after.")

    before, *burst, after = packets
    first, last = burst[0], burst[-1]
    gap_ns = int(first["pc_elapsed_ns"]) - int(before["pc_elapsed_ns"])
    lidar_span_ns = int(last["lidar_elapsed_ns"]) - int(first["lidar_elapsed_ns"])
    pc_span_ns = int(last["pc_elapsed_ns"]) - int(first["pc_elapsed_ns"])

    print(f"PC read gap: {gap_ns / 1_000_000:.4f} ms")
    print(f"Burst: {len(burst)} packets")
    print(f"Lidar measurement span: {lidar_span_ns / 1_000_000:.6f} ms")
    print(f"PC read span: {pc_span_ns / 1_000_000:.4f} ms")
    print(f"Skipped sequence count on the next read: {int(after['missing_before'])}")

    if (gap_ns, lidar_span_ns, pc_span_ns) != (97_158_600, 56_316_229, 764_900):
        raise SystemExit("The calculated intervals differ from the report.")


if __name__ == "__main__":
    main()
