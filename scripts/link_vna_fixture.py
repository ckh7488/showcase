"""Keep the independent A03 card reachable from the locally exported RF cover.

Run after the RF project's local ATLAS export. This changes only the navigation
of the ATLAS copy; it does not change the RF source, model or offline archive.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARKER = '<!-- A03_INDEPENDENT_REPORT -->'
LINK = (MARKER + '<a href="../vna-calibration-fixture/">'
        'CM 프로브 교정지그 · A03 독립 문서 →</a><!-- /A03_INDEPENDENT_REPORT -->')


def main():
    path = ROOT / 'reports/rf-current-probe/index.html'
    text = path.read_text(encoding='utf-8')
    if MARKER in text:
        print('A03 independent report link already present.')
        return
    target = '<div class="technical-links">'
    if text.count(target) != 1:
        raise ValueError('RF cover structure changed; inspect before inserting the link.')
    path.write_text(text.replace(target, target + LINK, 1), encoding='utf-8')
    print('Linked A03 independent report from the RF cover.')


if __name__ == '__main__':
    main()
