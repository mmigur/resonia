// Проверка DSP-логики и контента на синтетических сигналах: node tests/dsp.test.mjs
import assert from 'node:assert/strict';
import { SR, autocorrPitch, layout, totalDur, analyze, midiToHz, levelFor, chooseSpiceOrder, spiceOutputToHz, hzToMidi, resampleTo16k, vibratoKind } from '../src/lib/dsp.js';
import { TEST, UNITS, EXERCISES, ACHIEVEMENTS, PASS_SCORE } from '../src/lib/exercises.js';
import { RYABINA_A, RYABINA_B, RYABINA_HALF } from '../src/lib/songs.js';

const LEAD = 0.12; // «реакция» певца

// Синтез пения по раскладке. Параметры:
//   vibrato — размах в полутонах (амплитуда), drift — уход тона в центах/сек внутри ноты,
//   scoop — «подъезд» снизу: { cents, dur }
function sing(lay, midiFor, { vibrato = 0, noise = 0.01, lead = LEAD, drift = 0, scoop = null } = {}) {
  const total = lay[lay.length - 1].start + lay[lay.length - 1].dur + 0.6;
  const out = new Float32Array(Math.floor(total * SR));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR - lead;
    const n = lay.find((x) => t >= x.start && t < x.start + x.dur);
    if (!n) continue;
    const dt = t - n.start;
    let m = midiFor(n) + vibrato * Math.sin(2 * Math.PI * 5.5 * t) + (drift / 100) * dt;
    if (scoop) m += (scoop.cents / 100) * Math.max(0, 1 - dt / scoop.dur);
    phase += (2 * Math.PI * midiToHz(m)) / SR;
    const env = Math.min(1, dt / 0.03, (n.start + n.dur - t) / 0.03);
    out[i] = 0.4 * env * (Math.sin(phase) + 0.3 * Math.sin(2 * phase)) + (Math.random() - 0.5) * noise;
  }
  return out;
}

let passed = 0;
const t = (name, fn) => {
  fn();
  passed++;
  console.log('✓', name);
};

const lay = layout(TEST.notes, TEST.beat);
const rel = (x) => analyze({ frames: autocorrPitch(x), lay, mode: 'relative' });

t('autocorr: определяет высоту синуса 220 Гц', () => {
  const x = new Float32Array(SR);
  for (let i = 0; i < x.length; i++) x[i] = 0.4 * Math.sin((2 * Math.PI * 220 * i) / SR);
  const fr = autocorrPitch(x).filter((f) => f.conf > 0.9);
  assert.ok(fr.length > 20);
  const med = fr.map((f) => f.f).sort((a, b) => a - b)[fr.length >> 1];
  assert.ok(Math.abs(med - 220) < 2, `получено ${med}`);
});

t('чистое пение (relative, любая тональность) → высокий балл', () => {
  for (const tonic of [48, 55, 62]) {
    const res = rel(sing(lay, (n) => tonic + n.semi));
    assert.ok(res.ok);
    assert.ok(res.score >= 85, `тоника ${tonic}: балл ${res.score}`);
    assert.ok(Math.abs(res.tonicMidi - tonic) < 0.3, `тоника ${res.tonicMidi}`);
  }
});

t('фальшивое пение (±60 центов на части нот) → заметно ниже', () => {
  const good = rel(sing(lay, (n) => 55 + n.semi));
  const bad = rel(sing(lay, (n) => 55 + n.semi + (n.semi === 7 ? 0.6 : n.semi === 5 ? -0.6 : 0)));
  assert.ok(bad.score < good.score - 15, `good ${good.score}, bad ${bad.score}`);
});

t('absolute: пение от нужной ноты и на октаву ниже → оба высокие', () => {
  const base = 57;
  const a = analyze({ frames: autocorrPitch(sing(lay, (n) => base + n.semi)), lay, mode: 'absolute', startMidi: base });
  const b = analyze({ frames: autocorrPitch(sing(lay, (n) => base - 12 + n.semi)), lay, mode: 'absolute', startMidi: base });
  assert.ok(a.score >= 85, `a ${a.score}`);
  assert.ok(b.score >= 85, `b ${b.score}`);
});

t('absolute: пение на 3 полутона ниже → низкий балл', () => {
  const base = 57;
  const r = analyze({ frames: autocorrPitch(sing(lay, (n) => base - 3 + n.semi)), lay, mode: 'absolute', startMidi: base });
  assert.ok(r.score < 30, `балл ${r.score}`);
  assert.ok(r.meanCents < -200, `сдвиг ${r.meanCents}`);
});

t('тишина → ok=false', () => {
  const r = rel(new Float32Array(Math.floor(15 * SR)));
  assert.equal(r.ok, false);
});

t('уровни', () => {
  assert.equal(levelFor(20, 30).idx, 1);
  assert.equal(levelFor(55, 60).idx, 2);
  assert.equal(levelFor(80, 80).idx, 3);
  assert.equal(levelFor(95, 95).idx, 4);
});

t('SPICE: формула выхода → Гц и выбор порядка выходов', () => {
  const toOut = (hz) => (12 * Math.log2(hz / 10) - 25.58) / 63.07;
  assert.ok(Math.abs(spiceOutputToHz(toOut(220)) - 220) < 1e-6);
  const x = sing(lay, (n) => 55 + n.semi);
  const ac = autocorrPitch(x);
  const pit = ac.map((f) => (f.f ? toOut(f.f) : 0.3));
  const unc = ac.map((f) => (f.conf > 0.5 ? 0.05 : 0.9));
  assert.equal(chooseSpiceOrder(unc, pit, ac).pit, pit);
  assert.equal(chooseSpiceOrder(pit, unc, ac).pit, pit);
});

t('resampleTo16k: 48 кГц → 16 кГц сохраняет высоту тона', () => {
  const rate = 48000;
  const x = new Float32Array(rate);
  for (let i = 0; i < x.length; i++) x[i] = 0.4 * Math.sin((2 * Math.PI * 300 * i) / rate);
  const y = resampleTo16k(x, rate);
  assert.equal(y.length, SR);
  const fr = autocorrPitch(y).filter((f) => f.conf > 0.9);
  const med = fr.map((f) => f.f).sort((a, b) => a - b)[fr.length >> 1];
  assert.ok(Math.abs(hzToMidi(med) - hzToMidi(300)) < 0.15, `получено ${med}`);
});

// ---------- расширенные метрики ----------
const clean = rel(sing(lay, (n) => 55 + n.semi));

t('метрики: чистое пение даёт полный набор хороших значений', () => {
  const m = clean.metrics;
  assert.ok(m, 'нет metrics');
  assert.ok(m.intervals >= 85, `интервалы ${m.intervals}`);
  assert.ok(m.attack >= 75, `вступление ${m.attack} (${m.attackMs} мс)`);
  assert.ok(m.endurance >= 80, `выносливость ${m.endurance} (${m.driftCents} ц/с)`);
  assert.equal(m.vibrato.kind, 'steady', `вибрато ${JSON.stringify(m.vibrato)}`);
  assert.ok(m.coverage >= 90, `охват ${m.coverage}`);
  assert.ok(m.spanSemis >= 6, `диапазон ${m.spanSemis}`);
});

t('метрики: «узкие» прыжки → leapBias < 0 и интервалы хуже', () => {
  const narrow = rel(sing(lay, (n) => 55 + n.semi * 0.8));
  assert.ok(narrow.metrics.leapBias < -20, `leapBias ${narrow.metrics.leapBias}`);
  assert.ok(narrow.metrics.intervals < clean.metrics.intervals - 10, `${narrow.metrics.intervals} vs ${clean.metrics.intervals}`);
});

t('метрики: «широкие» прыжки → leapBias > 0', () => {
  const wide = rel(sing(lay, (n) => 55 + n.semi * 1.2));
  assert.ok(wide.metrics.leapBias > 20, `leapBias ${wide.metrics.leapBias}`);
});

t('метрики: просадка тона на долгой ноте → отрицательный дрейф и низкая выносливость', () => {
  const sag = rel(sing(lay, (n) => 55 + n.semi, { drift: -30 }));
  assert.ok(sag.metrics.driftCents < -15 && sag.metrics.driftCents > -50, `дрейф ${sag.metrics.driftCents}`);
  assert.ok(sag.metrics.endurance < clean.metrics.endurance - 25, `${sag.metrics.endurance} vs ${clean.metrics.endurance}`);
});

t('метрики: «подъезд» к ноте замедляет вступление', () => {
  const scoop = rel(sing(lay, (n) => 55 + n.semi, { scoop: { cents: -150, dur: 0.25 } }));
  assert.ok(scoop.metrics.attackMs > clean.metrics.attackMs + 60, `${scoop.metrics.attackMs} vs ${clean.metrics.attackMs} мс`);
  assert.ok(scoop.metrics.attack < clean.metrics.attack - 10, `${scoop.metrics.attack} vs ${clean.metrics.attack}`);
});

t('метрики: вибрато ±50¢ на 5,5 Гц определяется как вибрато', () => {
  const vib = rel(sing(lay, (n) => 55 + n.semi, { vibrato: 0.5 }));
  const v = vib.metrics.vibrato;
  assert.ok(v, 'нет вибрато');
  assert.equal(v.kind, 'vibrato', JSON.stringify(v));
  assert.ok(Math.abs(v.rate - 5.5) <= 1, `частота ${v.rate}`);
  assert.ok(v.extent >= 25 && v.extent <= 70, `размах ${v.extent}`);
});

t('метрики: без длинных нот выносливость и вибрато = null', () => {
  const short = layout(RYABINA_HALF.map((n) => ({ ...n, beats: 0.8 })), 0.7);
  const x = sing(short, (n) => 55 + n.semi);
  const r = analyze({ frames: autocorrPitch(x), lay: short, mode: 'relative' });
  assert.ok(r.ok);
  assert.equal(r.metrics.endurance, null);
  assert.equal(r.metrics.vibrato, null);
});

t('классификация вибрато', () => {
  assert.equal(vibratoKind(5.5, 5), 'steady');
  assert.equal(vibratoKind(5.5, 30), 'vibrato');
  assert.equal(vibratoKind(8.5, 30), 'fast');
  assert.equal(vibratoKind(3.5, 30), 'slow');
  assert.equal(vibratoKind(5.5, 90), 'wide');
});

// ---------- контент ----------
t('мелодия: 11 нот в первой фразе, 13 во второй, тоника и диапазон корректны', () => {
  assert.equal(RYABINA_A.length, 11);
  assert.equal(RYABINA_B.length, 13);
  // фраза «Калинки» (ABC, ключ Em): B A F# G A F# G A G F# E = 7 5 2 3 5 2 3 5 3 2 0
  assert.deepEqual(RYABINA_A.map((n) => n.semi), [7, 5, 2, 3, 5, 2, 3, 5, 3, 2, 0]);
  assert.deepEqual(RYABINA_B.map((n) => n.semi), [7, 7, 5, 3, 2, 3, 5, 2, 3, 5, 3, 2, 0]);
});

t('контент: больше 10 уроков, 4 раздела, данные корректны', () => {
  assert.ok(EXERCISES.length >= 20, `уроков ${EXERCISES.length}`);
  assert.equal(UNITS.length, 4);
  assert.equal(new Set(EXERCISES.map((e) => e.id)).size, EXERCISES.length, 'id не уникальны');
  for (const ex of EXERCISES) {
    assert.ok(ex.notes.length >= 1, ex.id);
    for (const n of ex.notes) {
      assert.ok(Number.isFinite(n.semi) && n.semi >= 0 && n.semi <= 12, `${ex.id}: semi ${n.semi}`);
      assert.ok(n.beats > 0, `${ex.id}: beats`);
      assert.ok(typeof n.syl === 'string' && n.syl.length > 0, `${ex.id}: syl`);
      assert.ok(!/[A-Za-z]/.test(n.syl), `${ex.id}: слог «${n.syl}» не на русском`);
    }
    const dur = totalDur(layout(ex.notes, ex.beat));
    assert.ok(dur >= 2 && dur <= 18, `${ex.id}: длительность ${dur.toFixed(1)} с`);
  }
  assert.ok(!/[A-Za-z]/.test(TEST.notes.map((n) => n.syl).join('')), 'тест не на русском');
});

t('достижения: разделы и «Мастер» считаются по зачётным урокам', () => {
  const unit1 = UNITS[0].lessons.map((l) => ({ id: l.id, score: PASS_SCORE }));
  const a = Object.fromEntries(ACHIEVEMENTS.map((x) => [x.id, x]));
  assert.equal(a.unit1.check({ baseline: null, sessions: unit1, xp: 0 }, { streak: 0 }), true);
  assert.equal(a.unit1.check({ baseline: null, sessions: unit1.slice(1), xp: 0 }, { streak: 0 }), false);
  assert.equal(a.all_done.check({ baseline: null, sessions: unit1, xp: 0 }, { streak: 0 }), false);
  const all = EXERCISES.map((l) => ({ id: l.id, score: 99 }));
  assert.equal(a.all_done.check({ baseline: null, sessions: all, xp: 0 }, { streak: 0 }), true);
});

console.log(`\nВсе проверки пройдены: ${passed}`);
