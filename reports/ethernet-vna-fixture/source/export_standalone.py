"""Embed this report's assets for an offline, single-file review copy."""
from pathlib import Path
from urllib.parse import urlsplit
import argparse
import base64
import re

HERE=Path(__file__).resolve().parents[1]


def build(output):
    text=(HERE/'index.html').read_text(encoding='utf-8')
    def stylesheet(match):
        path=(HERE/urlsplit(match[1]).path).resolve()
        return '<style>'+path.read_text(encoding='utf-8')+'</style>'
    text=re.sub(r'<link rel="stylesheet" href="([^"]+)"\s*/?>',stylesheet,text)
    def script(match):
        path=HERE/urlsplit(match[1]).path
        return '<script>'+path.read_text(encoding='utf-8').replace('</script','<\\/script')+'</script>'
    text=re.sub(r'<script src="([^"]+)"></script>',script,text)
    def image(match):
        path=HERE/match[1];mime='image/png' if path.suffix=='.png' else 'image/jpeg'
        return 'data:'+mime+';base64,'+base64.b64encode(path.read_bytes()).decode()
    text=re.sub(r'(assets/design-\d+\.(?:jpg|png))',image,text)
    text=text.replace('href="../../"','href="https://ckh7488.github.io/showcase/"')
    text=re.sub(r'<link rel="icon"[^>]*>','',text)
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(text,encoding='utf-8')
    print('Saved standalone report:',output)


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('output',type=Path)
    build(parser.parse_args().output)
