// Работа с микрофоном и синтезом тонов (Web Audio API).
import { SR, resampleTo16k, midiToHz, autocorrPitch } from './dsp.js'

let ctx = null
let micStream = null

export function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

export async function getMic() {
  if (micStream && micStream.getAudioTracks().some((t) => t.readyState === 'live')) return micStream
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  })
  return micStream
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function tone(midi, at, dur, vol = 0.22) {
  const c = getCtx()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = 'triangle'
  osc.frequency.value = midiToHz(midi)
  g.gain.setValueAtTime(0, at)
  g.gain.linearRampToValueAtTime(vol, at + 0.03)
  g.gain.setValueAtTime(vol, at + Math.max(0.04, dur - 0.08))
  g.gain.linearRampToValueAtTime(0, at + dur)
  osc.connect(g).connect(c.destination)
  osc.start(at)
  osc.stop(at + dur + 0.02)
}

function click(at) {
  const c = getCtx()
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.frequency.value = 1200
  g.gain.setValueAtTime(0.25, at)
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.06)
  osc.connect(g).connect(c.destination)
  osc.start(at)
  osc.stop(at + 0.08)
}

// Проигрывает эталонную мелодию. lay — раскладка с start/dur, baseMidi — тоника.
// onNote(i) — индекс играющей ноты (-1 в конце); onStart(perfMs) — момент (performance.now) нулевой секунды мелодии.
export async function playMelody(lay, baseMidi, onNote, onStart) {
  const c = getCtx()
  const t0 = c.currentTime + 0.15
  if (onStart) onStart(performance.now() + (t0 - c.currentTime) * 1000)
  lay.forEach((n, i) => {
    tone(baseMidi + n.semi, t0 + n.start, n.dur * 0.95)
    setTimeout(() => onNote && onNote(i), (t0 - c.currentTime + n.start) * 1000)
  })
  const last = lay[lay.length - 1]
  await sleep((t0 - c.currentTime + last.start + last.dur) * 1000 + 150)
  onNote && onNote(-1)
}

export async function countIn(beats, beatSec, onBeat) {
  const c = getCtx()
  const t0 = c.currentTime + 0.1
  for (let i = 0; i < beats; i++) {
    click(t0 + i * beatSec)
    setTimeout(() => onBeat && onBeat(i + 1), (t0 - c.currentTime + i * beatSec) * 1000)
  }
  await sleep((t0 - c.currentTime + beats * beatSec) * 1000)
}

// Запись голоса заданной длительности. Возвращает Float32Array 16 кГц.
// opts.onLevel(rms) — громкость каждого буфера; opts.onPitch({t, f, conf}) — «живая» высота тона
// (t — секунды от начала записи); opts.onStart(perfMs) — момент старта записи.
export async function recordFor(seconds, opts = {}) {
  const { onLevel, onPitch, onStart } = opts
  const c = getCtx()
  const stream = await getMic()
  const src = c.createMediaStreamSource(stream)
  const proc = c.createScriptProcessor(2048, 1, 1)
  const mute = c.createGain()
  mute.gain.value = 0
  const chunks = []
  let roll = new Float32Array(0)
  const startPerf = performance.now()
  if (onStart) onStart(startPerf)

  proc.onaudioprocess = (e) => {
    const d = e.inputBuffer.getChannelData(0)
    chunks.push(new Float32Array(d))
    if (onLevel) {
      let s = 0
      for (let i = 0; i < d.length; i++) s += d[i] * d[i]
      onLevel(Math.sqrt(s / d.length))
    }
    if (onPitch) {
      // скользящее окно ~1024 отсчётов при 16 кГц → одна оценка высоты на буфер
      const c16 = resampleTo16k(new Float32Array(d), c.sampleRate)
      const tmp = new Float32Array(roll.length + c16.length)
      tmp.set(roll)
      tmp.set(c16, roll.length)
      roll = tmp.length > 2048 ? tmp.slice(tmp.length - 2048) : tmp
      if (roll.length >= 1024) {
        const fr = autocorrPitch(roll.slice(roll.length - 1024))[0]
        if (fr) onPitch({ t: (performance.now() - startPerf) / 1000 - 0.03, f: fr.f, conf: fr.conf })
      }
    }
  }
  src.connect(proc)
  proc.connect(mute).connect(c.destination)
  await sleep(seconds * 1000)
  proc.onaudioprocess = null
  src.disconnect()
  proc.disconnect()
  const total = chunks.reduce((a, b) => a + b.length, 0)
  const all = new Float32Array(total)
  let o = 0
  for (const ch of chunks) {
    all.set(ch, o)
    o += ch.length
  }
  return resampleTo16k(all, c.sampleRate)
}

export { SR }
