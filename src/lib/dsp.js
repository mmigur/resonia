// Чистая DSP-логика без обращения к браузерным API (поэтому тестируется в Node).

export const SR = 16000; // SPICE работает на 16 кГц, моно
export const HOP = 512; // один кадр SPICE = 512 сэмплов = 32 мс
export const FRAME_SEC = HOP / SR;

export const hzToMidi = (f) => 12 * Math.log2(f / 440) + 69;
export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export function midiName(m) {
  const r = Math.round(m);
  return NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1);
}

export function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

export function percentile(a, p) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const idx = Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))));
  return s[idx];
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Приведение записи с частоты дискретизации устройства к 16 кГц (усреднение по окну).
export function resampleTo16k(input, inRate) {
  if (inRate === SR) return input;
  const ratio = inRate / SR;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let s = 0;
    for (let j = start; j < end; j++) s += input[j];
    out[i] = s / (end - start);
  }
  return out;
}

// Простой автокорреляционный детектор высоты тона.
// Используется (1) как запасной вариант, если SPICE не загрузился,
// (2) для перекрёстной проверки порядка выходов модели.
export function autocorrPitch(x) {
  const W = 1024;
  const minLag = Math.floor(SR / 900);
  const maxLag = Math.ceil(SR / 70);
  const L = W - maxLag - 2;
  const n = Math.max(0, Math.floor((x.length - W) / HOP) + 1);
  const frames = [];
  for (let i = 0; i < n; i++) {
    const s = i * HOP;
    const t = (s + W / 2) / SR;
    let e = 0;
    for (let j = 0; j < W; j++) e += x[s + j] * x[s + j];
    if (Math.sqrt(e / W) < 0.008) {
      frames.push({ t, f: 0, conf: 0 });
      continue;
    }
    let e1 = 0;
    for (let j = 0; j < L; j++) e1 += x[s + j] * x[s + j];
    const r = new Float32Array(maxLag + 2);
    let best = 0;
    for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
      let c = 0;
      let e2 = 0;
      for (let j = 0; j < L; j++) {
        const b = x[s + j + lag];
        c += x[s + j] * b;
        e2 += b * b;
      }
      r[lag] = c / Math.sqrt(e1 * e2 + 1e-9);
      if (lag >= minLag && lag <= maxLag && r[lag] > best) best = r[lag];
    }
    let pick = -1;
    for (let lag = minLag; lag <= maxLag; lag++) {
      if (r[lag] >= 0.9 * best && r[lag] >= r[lag - 1] && r[lag] >= r[lag + 1]) {
        pick = lag;
        break;
      }
    }
    if (pick < 0 || best < 0.3) {
      frames.push({ t, f: 0, conf: 0 });
      continue;
    }
    const a = r[pick - 1];
    const b = r[pick];
    const c = r[pick + 1];
    const denom = a - 2 * b + c;
    const shift = denom !== 0 ? (0.5 * (a - c)) / denom : 0;
    frames.push({ t, f: SR / (pick + shift), conf: clamp(b, 0, 1) });
  }
  return frames;
}

// Перевод выхода SPICE в герцы (формула из официального демо Magenta/TF Hub).
export function spiceOutputToHz(v) {
  const PT_OFFSET = 25.58;
  const PT_SLOPE = 63.07;
  const FMIN = 10.0;
  const BINS_PER_OCTAVE = 12.0;
  const cqtBin = v * PT_SLOPE + PT_OFFSET;
  return FMIN * Math.pow(2.0, cqtBin / BINS_PER_OCTAVE);
}

export function framesFromSpice(pitches, uncertainties) {
  const frames = [];
  for (let i = 0; i < pitches.length; i++) {
    frames.push({
      t: (i + 0.5) * FRAME_SEC,
      f: spiceOutputToHz(pitches[i]),
      conf: clamp(1 - uncertainties[i], 0, 1),
    });
  }
  return frames;
}

// Раскладка нот по времени: добавляет start/dur в секундах.
export function layout(notes, beatSec) {
  let t = 0;
  return notes.map((n) => {
    const o = { ...n, start: t, dur: n.beats * beatSec };
    t += o.dur;
    return o;
  });
}
export function totalDur(lay) {
  const last = lay[lay.length - 1];
  return last.start + last.dur;
}

export const foldSemis = (d) => ((((d + 6) % 12) + 12) % 12) - 6;

export const LAG = 0.1; // поправка на реакцию певца, сек
const MIN_CONF = 0.6;

const noteScore = (absCents) => (absCents <= 25 ? 1 : Math.max(0, 1 - (absCents - 25) / 75));
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

// Линейная регрессия y = intercept + slope * x
function linfit(xs, ys) {
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let den = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  const slope = den > 0 ? num / den : 0;
  return { slope, intercept: my - slope * mx };
}

// Частота и размах колебаний (вибрато) в остатке после вычета тренда. res — центы.
function vibratoOf(ts, res) {
  let best = { rate: 0, extent: 0 };
  for (let f = 3; f <= 9; f += 0.25) {
    let re = 0;
    let im = 0;
    for (let i = 0; i < ts.length; i++) {
      re += res[i] * Math.cos(2 * Math.PI * f * ts[i]);
      im += res[i] * Math.sin(2 * Math.PI * f * ts[i]);
    }
    const amp = (2 * Math.sqrt(re * re + im * im)) / ts.length; // амплитуда «от нуля до пика»
    if (amp > best.extent) best = { rate: f, extent: amp };
  }
  return best;
}

export function vibratoKind(rate, extent) {
  if (extent < 12) return 'steady'; // ровный звук
  if (extent > 70) return 'wide'; // слишком широкое колебание
  if (rate > 7.5) return 'fast'; // частое дрожание
  if (rate < 4.5) return 'slow'; // медленное покачивание
  return 'vibrato'; // естественное вибрато
}

/**
 * Расширенные метрики голоса. Все оценки 0..100, где больше = лучше; null — метрику
 * по этой записи посчитать нельзя (нет нужного материала: например, нет длинных нот).
 */
export function computeMetrics({ voiced, lay, perNote, score, stability, meanCents, range, hitRatio }) {
  // 1. Интервалы: насколько точно выдержаны расстояния между соседними нотами
  const pairs = [];
  for (let i = 1; i < lay.length; i++) {
    const a = perNote[i - 1];
    const b = perNote[i];
    if (!a.hit || !b.hit) continue;
    const tgt = lay[i].semi - lay[i - 1].semi;
    if (tgt === 0) continue;
    const errSemi = foldSemis(b.midi - a.midi - tgt);
    pairs.push({ tgt, err: errSemi * 100, signed: errSemi * 100 * Math.sign(tgt) });
  }
  const sc = (arr) => (arr.length ? Math.round((100 * arr.reduce((s, p) => s + noteScore(Math.abs(p.err)), 0)) / arr.length) : null);
  const leaps = pairs.filter((p) => Math.abs(p.tgt) >= 3);
  const steps = pairs.filter((p) => Math.abs(p.tgt) < 3);
  const leapBias = leaps.length >= 2 ? Math.round(mean(leaps.map((p) => p.signed))) : null; // <0: прыжки «узкие»

  // 2. Скорость вступления: за какое время после начала ноты тон «встал» на место
  const settles = [];
  lay.forEach((n, i) => {
    const p = perNote[i];
    if (!p.hit) return;
    const fr = voiced.filter((f) => f.t >= n.start + LAG * 0.5 && f.t <= n.start + n.dur * 0.8 + LAG);
    const dev = fr.map((f) => Math.abs(foldSemis(hzToMidi(f.f) - p.midi)) * 100);
    for (let j = 0; j < fr.length - 1; j++) {
      if (dev[j] <= 40 && dev[j + 1] <= 40) {
        settles.push(Math.max(0, fr[j].t - n.start));
        break;
      }
    }
  });
  const attackMs = settles.length >= 2 ? Math.round(median(settles) * 1000) : null;
  const attack = attackMs === null ? null : Math.round(clamp((100 * (600 - attackMs)) / 400, 0, 100));

  // 3. Длинные ноты: просадка/уход тона и вибрато
  const drifts = [];
  const vibs = [];
  lay.forEach((n, i) => {
    if (n.dur < 1.2 || !perNote[i].hit) return;
    const fr = voiced.filter((f) => f.t >= n.start + 0.3 * n.dur + LAG && f.t <= n.start + n.dur + LAG * 0.5);
    const ms = fr.map((f) => hzToMidi(f.f));
    const med = median(ms);
    const keep = fr.filter((_, k) => Math.abs(ms[k] - med) <= 1);
    if (keep.length < 12) return;
    const ts = keep.map((f) => f.t);
    const ys = keep.map((f) => hzToMidi(f.f) * 100);
    const { slope, intercept } = linfit(ts, ys);
    drifts.push(slope);
    vibs.push(vibratoOf(ts, ys.map((y, k) => y - (intercept + slope * ts[k]))));
  });
  const driftCents = drifts.length ? Math.round(median(drifts) * 10) / 10 : null; // центы в секунду
  const endurance = driftCents === null ? null : Math.round(clamp(100 * (1 - (Math.abs(driftCents) - 6) / 34), 0, 100));
  let vibrato = null;
  if (vibs.length) {
    const rate = median(vibs.map((v) => v.rate));
    const extent = median(vibs.map((v) => v.extent));
    vibrato = { rate: Math.round(rate * 10) / 10, extent: Math.round(extent), kind: vibratoKind(rate, extent) };
  }

  const hitMidi = perNote.filter((p) => p.hit).map((p) => p.midi);
  return {
    accuracy: score,
    stability,
    intervals: sc(pairs),
    leaps: sc(leaps),
    steps: sc(steps),
    leapBias,
    attack,
    attackMs,
    endurance,
    driftCents,
    vibrato,
    coverage: Math.round(hitRatio * 100),
    meanCents: Math.round(meanCents),
    spanSemis: isFinite(range.lo) && isFinite(range.hi) ? Math.round(range.hi - range.lo) : null,
    centerMidi: hitMidi.length ? Math.round(median(hitMidi) * 10) / 10 : null,
  };
}

/**
 * Оценка пения.
 * mode 'relative': тональность свободная, оценивается точность интервалов (тоника берётся из пения).
 * mode 'absolute': ноты сравниваются с эталоном от startMidi; октавные сдвиги прощаются.
 */
export function analyze({ frames, lay, mode, startMidi }) {
  const voiced = frames.filter((fr) => fr.conf >= MIN_CONF && fr.f >= 60 && fr.f <= 1200);
  const perNote = lay.map((n) => {
    const w0 = n.start + 0.25 * n.dur + LAG;
    const w1 = n.start + n.dur + LAG * 0.5;
    const ms = voiced.filter((fr) => fr.t >= w0 && fr.t <= w1).map((fr) => hzToMidi(fr.f));
    if (ms.length < 3) return { semi: n.semi, hit: false };
    const m = median(ms);
    const inliers = ms.filter((v) => Math.abs(v - m) <= 1);
    const mean = inliers.reduce((a, b) => a + b, 0) / inliers.length;
    const std = Math.sqrt(inliers.reduce((a, b) => a + (b - mean) ** 2, 0) / inliers.length) * 100;
    return { semi: n.semi, hit: true, midi: m, stdCents: std };
  });

  const hits = perNote.filter((p) => p.hit);
  if (!hits.length) {
    return { ok: false, score: 0, perNote, voicedRatio: 0 };
  }

  let tonic;
  if (mode === 'relative') {
    tonic = median(hits.map((p) => p.midi - p.semi));
  } else {
    tonic = startMidi;
  }

  perNote.forEach((p) => {
    if (!p.hit) {
      p.cents = null;
      p.score = 0;
      return;
    }
    const target = tonic + p.semi;
    p.target = target;
    p.cents = foldSemis(p.midi - target) * 100;
    const a = Math.abs(p.cents);
    p.score = a <= 25 ? 1 : Math.max(0, 1 - (a - 25) / 75);
  });

  const score = Math.round((perNote.reduce((a, p) => a + p.score, 0) / perNote.length) * 100);
  const medStd = median(hits.map((p) => p.stdCents));
  const stability = Math.round(clamp(100 - Math.max(0, medStd - 12) * 2.2, 0, 100));
  const meanCents = hits.reduce((a, p) => a + p.cents, 0) / hits.length;

  const allMidi = frames
    .filter((fr) => fr.conf >= 0.7 && fr.f >= 60 && fr.f <= 1200)
    .map((fr) => hzToMidi(fr.f));
  const range = allMidi.length
    ? { lo: percentile(allMidi, 5), hi: percentile(allMidi, 95) }
    : { lo: NaN, hi: NaN };

  const hitRatio = hits.length / perNote.length;
  const metrics = computeMetrics({ voiced, lay, perNote, score, stability, meanCents, range, hitRatio });

  return {
    ok: true,
    score,
    stability,
    meanCents,
    tonicMidi: tonic,
    range,
    perNote,
    hitRatio,
    voicedRatio: voiced.length / Math.max(1, frames.length),
    metrics,
  };
}

export function levelFor(score, stability) {
  const combined = 0.7 * score + 0.3 * stability;
  if (combined < 40) return { idx: 1, name: 'Начинающий' };
  if (combined < 65) return { idx: 2, name: 'Развивающийся' };
  if (combined < 85) return { idx: 3, name: 'Уверенный' };
  return { idx: 4, name: 'Продвинутый' };
}

// Выбор порядка выходов SPICE (uncertainty/pitch) через сверку с автокорреляцией.
export function chooseSpiceOrder(a, b, acFrames) {
  const cands = [
    { unc: a, pit: b },
    { unc: b, pit: a },
  ];
  const errs = cands.map((c) => {
    const diffs = [];
    for (let i = 0; i < c.pit.length && i < acFrames.length; i++) {
      const ac = acFrames[i];
      if (ac.conf < 0.85 || !ac.f) continue;
      const f = spiceOutputToHz(c.pit[i]);
      if (!isFinite(f) || f <= 0) continue;
      diffs.push(Math.abs(foldSemis(hzToMidi(f) - hzToMidi(ac.f))));
    }
    return diffs.length >= 5 ? median(diffs) : null;
  });
  if (errs[0] === null || errs[1] === null) return cands[0];
  return errs[1] < errs[0] ? cands[1] : cands[0];
}
