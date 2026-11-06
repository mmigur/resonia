// Загрузка и запуск модели SPICE (TensorFlow.js).
import { framesFromSpice, autocorrPitch, chooseSpiceOrder } from './dsp.js'

const MODEL_URLS = [
  'https://tfhub.dev/google/tfjs-model/spice/2/default/1', // через fromTFHub
  'https://storage.googleapis.com/tfhub-tfjs-modules/google/tfjs-model/spice/2/default/1/model.json', // прямая ссылка
]
const IDB_URL = 'indexeddb://resonia-spice-v2'

export const engine = { status: 'idle', usedFallback: false }
let loading = null
const listeners = new Set()
export function onEngineChange(fn) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
function setStatus(s) {
  engine.status = s
  listeners.forEach((fn) => fn(s))
}

export function loadSpice() {
  if (loading) return loading
  setStatus('loading')
  loading = (async () => {
    const tf = await import('@tensorflow/tfjs') // отдельный чанк, грузится лениво
    await tf.ready()
    let model
    try {
      model = await tf.loadGraphModel(IDB_URL) // из кэша браузера
    } catch {
      let lastErr
      for (let i = 0; i < MODEL_URLS.length && !model; i++) {
        try {
          model = await tf.loadGraphModel(MODEL_URLS[i], i === 0 ? { fromTFHub: true } : undefined)
        } catch (e) {
          lastErr = e
        }
      }
      if (!model) throw lastErr
      try {
        await model.save(IDB_URL)
      } catch {
        /* кэш необязателен */
      }
    }
    setStatus('ready')
    return { tf, model }
  })().catch((e) => {
    loading = null
    setStatus('failed')
    throw e
  })
  return loading
}

// samples: Float32Array, 16 кГц, моно. Возвращает кадры {t, f, conf}.
export async function pitchFrames(samples) {
  const ac = autocorrPitch(samples)
  try {
    const { tf, model } = await loadSpice()
    const input = tf.tensor(samples)
    let out
    try {
      out = model.predict(input)
    } catch {
      out = model.predict({ input_audio_samples: input })
    }
    const arr = Array.isArray(out) ? out : Object.values(out)
    const a = await arr[0].data()
    const b = await arr[1].data()
    tf.dispose([input, ...arr])
    const { unc, pit } = chooseSpiceOrder(Array.from(a), Array.from(b), ac)
    engine.usedFallback = false
    return framesFromSpice(pit, unc)
  } catch (e) {
    console.warn('SPICE недоступен, используется автокорреляция:', e)
    engine.usedFallback = true
    return ac
  }
}
