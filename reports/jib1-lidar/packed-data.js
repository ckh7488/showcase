/* Decoder for pack_lidar_frames.py v1; no quantization or resampling. */
'use strict';
window.loadPackedFrame = async function (url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`점군을 불러오지 못했습니다 (${response.status}). 다시 시도해 주세요.`);
  const buffer = await response.arrayBuffer();
  const headerSize = new DataView(buffer).getUint32(0, true);
  const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, headerSize)));
  if (header.version !== 1) throw new Error('지원하지 않는 점군 자료 버전입니다.');
  let offset = 4 + headerSize;
  const blocks = header.lengths.map(size => {
    const bytes = pako.inflate(new Uint8Array(buffer, offset, size));
    offset += size;
    return bytes;
  });
  function unshuffle(bytes, width) {
    const rows = bytes.length / width, result = new Uint8Array(bytes.length);
    for (let column = 0; column < width; column++) {
      const start = column * rows;
      for (let row = 0; row < rows; row++) result[row * width + column] = bytes[start + row];
    }
    return result;
  }
  const pool = new Uint32Array(unshuffle(blocks[0], 12).buffer);
  const indices = new Uint32Array(unshuffle(blocks[1], 4).buffer);
  function restore(value) {
    if (Array.isArray(value)) return value.map(restore);
    if (value && typeof value === 'object') {
      if ('$points' in value) {
        const [start, count] = value.$points, words = new Uint32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const at = indices[start + i] * 3;
          words[i * 3] = pool[at]; words[i * 3 + 1] = pool[at + 1]; words[i * 3 + 2] = pool[at + 2];
        }
        return new Uint8Array(words.buffer);
      }
      if ('$bytes' in value) return blocks[value.$bytes + 2];
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restore(item)]));
    }
    return value;
  }
  return restore(header.data);
};
