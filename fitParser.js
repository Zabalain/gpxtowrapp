// fitParser.js — parser binario de archivos .FIT, sin dependencias externas.
// Basado y validado contra un archivo real de Magene C606.

const BASE_TYPES = {
  0x00: { name: 'enum', size: 1, invalid: 0xFF },
  0x01: { name: 'sint8', size: 1, invalid: 0x7F },
  0x02: { name: 'uint8', size: 1, invalid: 0xFF },
  0x83: { name: 'sint16', size: 2, invalid: 0x7FFF },
  0x84: { name: 'uint16', size: 2, invalid: 0xFFFF },
  0x85: { name: 'sint32', size: 4, invalid: 0x7FFFFFFF },
  0x86: { name: 'uint32', size: 4, invalid: 0xFFFFFFFF },
  0x07: { name: 'string', size: 1, invalid: 0x00 },
  0x88: { name: 'float32', size: 4, invalid: null },
  0x89: { name: 'float64', size: 8, invalid: null },
  0x0A: { name: 'uint8z', size: 1, invalid: 0x00 },
  0x8B: { name: 'uint16z', size: 2, invalid: 0x0000 },
  0x8C: { name: 'uint32z', size: 4, invalid: 0x00000000 },
  0x0D: { name: 'byte', size: 1, invalid: 0xFF },
  0x8E: { name: 'sint64', size: 8, invalid: null },
  0x8F: { name: 'uint64', size: 8, invalid: null },
  0x90: { name: 'uint64z', size: 8, invalid: 0 },
};

// Parsea un ArrayBuffer .FIT y devuelve { [globalMesgNum]: [ {fieldNum: value, ...}, ... ] }
export function parseFitBuffer(buffer) {
  const dv = new DataView(buffer);
  const headerSize = dv.getUint8(0);
  const dataSize = dv.getUint32(4, true);
  let offset = headerSize;
  const end = headerSize + dataSize;
  const localDefs = {};
  let lastTimestamp = null;
  const messages = {};

  function readField(off, size, baseTypeByte) {
    const bt = BASE_TYPES[baseTypeByte];
    if (!bt) return null;
    if (bt.name === 'string') {
      const bytes = [];
      for (let i = 0; i < size; i++) {
        const b = dv.getUint8(off + i);
        if (b === 0) break;
        bytes.push(b);
      }
      return bytes.length ? String.fromCharCode(...bytes) : null;
    }
    if (bt.name === 'byte') {
      let hex = '';
      for (let i = 0; i < size; i++) hex += dv.getUint8(off + i).toString(16).padStart(2, '0');
      return hex;
    }
    const n = Math.max(1, Math.floor(size / bt.size));
    const readOne = (o) => {
      switch (bt.name) {
        case 'enum': case 'uint8': case 'uint8z': return dv.getUint8(o);
        case 'sint8': return dv.getInt8(o);
        case 'uint16': case 'uint16z': return dv.getUint16(o, true);
        case 'sint16': return dv.getInt16(o, true);
        case 'uint32': case 'uint32z': return dv.getUint32(o, true);
        case 'sint32': return dv.getInt32(o, true);
        case 'float32': return dv.getFloat32(o, true);
        case 'float64': return dv.getFloat64(o, true);
        case 'uint64': case 'uint64z': return Number(dv.getBigUint64(o, true));
        case 'sint64': return Number(dv.getBigInt64(o, true));
        default: return null;
      }
    };
    if (n <= 1) {
      const v = readOne(off);
      return (bt.invalid !== null && v === bt.invalid) ? null : v;
    }
    const arr = [];
    for (let i = 0; i < n; i++) {
      const v = readOne(off + i * bt.size);
      arr.push((bt.invalid !== null && v === bt.invalid) ? null : v);
    }
    return arr;
  }

  while (offset < end) {
    const headerByte = dv.getUint8(offset); offset += 1;
    let localMsgType, isDef, compressed = false, timeOffset = 0, devFlag = false;
    if (headerByte & 0x80) {
      localMsgType = (headerByte >> 5) & 0x3;
      timeOffset = headerByte & 0x1F;
      isDef = false; compressed = true;
    } else {
      isDef = !!(headerByte & 0x40);
      localMsgType = headerByte & 0xF;
      devFlag = !!(headerByte & 0x20);
    }

    if (isDef) {
      offset += 1; // reserved byte
      const arch = dv.getUint8(offset); offset += 1;
      const little = arch === 0;
      const globalNum = dv.getUint16(offset, little); offset += 2;
      const numFields = dv.getUint8(offset); offset += 1;
      const fields = [];
      for (let i = 0; i < numFields; i++) {
        fields.push([dv.getUint8(offset), dv.getUint8(offset + 1), dv.getUint8(offset + 2)]);
        offset += 3;
      }
      const devFields = [];
      if (devFlag) {
        const numDev = dv.getUint8(offset); offset += 1;
        for (let i = 0; i < numDev; i++) {
          devFields.push([dv.getUint8(offset), dv.getUint8(offset + 1), dv.getUint8(offset + 2)]);
          offset += 3;
        }
      }
      localDefs[localMsgType] = { global: globalNum, fields, devFields };
    } else {
      const defn = localDefs[localMsgType];
      if (!defn) break; // no podemos seguir sin definición
      const rec = {};
      for (const [fnum, fsize, btype] of defn.fields) {
        if (offset + fsize > end + 16) break;
        rec[fnum] = readField(offset, fsize, btype);
        offset += fsize;
      }
      for (const [, fsize] of defn.devFields) { offset += fsize; } // campos de desarrollador: se saltan
      if (compressed) {
        if (lastTimestamp !== null) {
          let base = lastTimestamp - (lastTimestamp % 32);
          let ts = base + timeOffset;
          if (ts < lastTimestamp) ts += 32;
          lastTimestamp = ts;
          rec[253] = ts;
        }
      } else if (rec[253] != null) {
        lastTimestamp = rec[253];
      }
      if (!messages[defn.global]) messages[defn.global] = [];
      messages[defn.global].push(rec);
    }
  }
  return messages;
}

// FIT epoch: 1989-12-31T00:00:00Z
const FIT_EPOCH_MS = Date.UTC(1989, 11, 31, 0, 0, 0);
function fitTimeToDate(fitSeconds) {
  return new Date(FIT_EPOCH_MS + fitSeconds * 1000);
}

// Convierte los mensajes crudos a un formato normalizado común (igual forma que produce gpxParser.js)
export function fitMessagesToActivity(messages) {
  const records = messages[20] || [];
  const session = (messages[18] || [])[0] || {};
  const laps = messages[19] || [];

  const points = records.map(r => ({
    lat: r[0] != null ? r[0] * (180 / 2147483648) : null,
    lon: r[1] != null ? r[1] * (180 / 2147483648) : null,
    ele: r[2] != null ? r[2] / 5 - 500 : null,
    time: r[253] != null ? fitTimeToDate(r[253]) : null,
    hr: r[3] != null ? r[3] : null,
    cadence: r[4] != null ? r[4] : null,
    power: r[7] != null ? r[7] : null,
    temp: r[13] != null ? r[13] : null,
    grade: r[9] != null ? r[9] / 100 : null,
    rightBalancePct: (r[30] != null && (r[30] & 0x80)) ? (r[30] & 0x7F) / 2 : null,
    torqueEffL: r[43] != null ? r[43] / 2 : null,
    torqueEffR: r[44] != null ? r[44] / 2 : null,
    smoothL: r[45] != null ? r[45] / 2 : null,
    smoothR: r[46] != null ? r[46] / 2 : null,
    smoothCombined: r[47] != null ? r[47] / 2 : null,
  })).filter(p => p.lat != null && p.lon != null);

  const sc = (v, scale = 1, offset = 0) => (v == null ? null : v / scale - offset);

  const summary = {
    source: 'fit',
    totalDistanceM: sc(session[9], 100),
    totalElapsedS: sc(session[7], 1000),
    totalTimerS: sc(session[8], 1000),
    totalMovingS: sc(session[59], 1000),
    totalAscentM: session[22] ?? null,
    totalDescentM: session[23] ?? null,
    avgPowerW: session[20] ?? null,
    maxPowerW: session[21] ?? null,
    normalizedPowerW: session[34] ?? null,
    intensityFactor: sc(session[36], 1000),
    trainingStressScore: sc(session[35], 10),
    ftpW: session[45] ?? null,
    avgHr: session[16] ?? null,
    maxHr: session[17] ?? null,
    avgCadence: session[18] ?? null,
    maxCadence: session[19] ?? null,
    avgTempC: session[57] ?? null,
    maxTempC: session[58] ?? null,
    calories: session[11] ?? null,
    totalWorkJ: session[48] ?? null,
    numLaps: laps.length || (session[26] ?? null),
  };

  return { points, summary };
}
