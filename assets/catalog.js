'use strict';
const grid = document.querySelector('#report-grid');
function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
function reportPath(value) {
  if (typeof value !== 'string' || !/^reports\/[a-z0-9-]+\//.test(value) || value.includes('..') || value.includes('\\')) throw new Error('잘못된 보고서 경로');
  const url = new URL(value, document.baseURI);
  if (url.origin !== location.origin) throw new Error('잘못된 보고서 주소');
  return value;
}
async function loadReports() {
  try {
    const response = await fetch('reports.json', {cache:'no-cache'});
    if (!response.ok) throw new Error('목록을 불러오지 못했습니다');
    const data = await response.json();
    if (data.version !== 1 || !Array.isArray(data.reports)) throw new Error('목록 형식이 잘못되었습니다');
    const fragment = document.createDocumentFragment();
    for (const report of data.reports) {
      const card = el('a', 'report-card'); card.href = reportPath(report.path);
      const cover = el('div','cover');
      const img = el('img'); img.src = reportPath(report.cover); img.alt = report.coverAlt; img.loading = 'lazy'; img.width=800; img.height=450;
      cover.append(img,el('span','cover-label','INTERACTIVE'));
      const body = el('div','card-body');
      const meta = el('div','card-meta');
      const time = el('time','',report.date.replaceAll('-','.')); time.dateTime=report.date;
      meta.append(el('span','card-category',report.category),time);
      const bottom = el('div','card-bottom'); const tags = el('div','tags');
      for (const tag of report.tags) tags.append(el('span','tag',tag));
      const open=el('span','open','보고서 열기'); open.append(el('b','','↗'));
      bottom.append(tags,open);
      body.append(meta,el('h3','',report.title),el('p','',report.summary),bottom);
      card.append(cover,body);fragment.append(card);
    }
    grid.replaceChildren(fragment);
    document.querySelector('#count').textContent=String(data.reports.length).padStart(2,'0');
    if (!data.reports.length) grid.append(el('p','state','아직 등록된 보고서가 없습니다.'));
  } catch(error) {
    const box=el('div','state');box.append(el('p','','보고서 목록을 불러오지 못했습니다.'));
    const retry=el('a','','다시 불러오기');retry.href='./';box.append(retry);grid.replaceChildren(box);
    console.error(error);
  }
}
loadReports();
