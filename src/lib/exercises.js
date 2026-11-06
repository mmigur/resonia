// Контент: тест, разделы и уроки дорожной карты, достижения.
// icon — имя иконки из lucide-react (см. src/lib/icons.ts)
// focus — какую метрику голоса тренирует урок (используется для рекомендаций)
import { RYABINA_A, RYABINA_HALF, RYABINA_B, RYABINA_FULL, RYABINA_SLOW } from './songs.js'

export const BEAT = 0.7 // секунд на долю по умолчанию
export const TEST_BASE_MIDI = 60 // C4: высота, на которой играет эталон теста
export const PASS_SCORE = 60 // зачёт урока
export const STAR_SCORES = [60, 80, 92] // 1, 2, 3 звезды

const CREDIT = 'Мелодия: народная «Калинка» (И. Ларионов, 1860). Слова авторские.'

export const TEST = {
  id: 'test',
  title: 'Рябинка',
  credit: CREDIT,
  beat: 0.8,
  notes: RYABINA_A,
}

const mk = (syls, semis, beats = 1) =>
  semis.map((s, i) => ({ semi: s, beats: Array.isArray(beats) ? beats[i] : beats, syl: syls[i] ?? 'ла' }))

const RAW = [
  {
    id: 'u1',
    title: 'Первые звуки',
    subtitle: 'Находим ноту и держим её',
    color: '#8b5cf6',
    level: 1,
    lessons: [
      { id: 'hold', kind: 'drill', focus: 'stability', icon: 'AudioLines', title: 'Одна нота', desc: 'Тяни одну ноту ровно, на «а-а-а». Главное — не «плавать».', notes: mk(['а-а-а'], [0], [4]) },
      { id: 'two', kind: 'drill', focus: 'accuracy', icon: 'ArrowUpDown', title: 'Две ноты', desc: 'Верх и обратно. Слушай эталон и догоняй его.', notes: mk(['ма', 'ми', 'ма'], [0, 2, 0], [2, 2, 3]) },
      { id: 'three', kind: 'drill', focus: 'accuracy', icon: 'TrendingUp', title: 'До-ре-ми', desc: 'Три ступени вверх и вниз. Плавно, без рывков.', notes: mk(['до', 'ре', 'ми', 'ре', 'до'], [0, 2, 4, 2, 0], [1, 1, 1, 1, 2]) },
      { id: 'five', kind: 'drill', focus: 'accuracy', icon: 'ListMusic', title: 'Пять ступеней', desc: 'До–ре–ми–фа–соль: первое знакомство с ладом.', notes: mk(['до', 'ре', 'ми', 'фа', 'соль'], [0, 2, 4, 5, 7], [1, 1, 1, 1, 2]) },
      { id: 'song1', kind: 'song', focus: 'intervals', icon: 'Music', title: 'Рябинка, начало', desc: 'Первая половина песни: шесть нот, ровный шаг.', credit: CREDIT, beat: 0.8, notes: RYABINA_HALF },
    ],
  },
  {
    id: 'u2',
    title: 'Интервалы',
    subtitle: 'Прыжки между нотами',
    color: '#ec4899',
    level: 2,
    lessons: [
      { id: 'down', kind: 'drill', focus: 'accuracy', icon: 'TrendingDown', title: 'Ступеньки вниз', desc: 'Спуск от соль до до. Вниз часто «проседают» — держи опору.', notes: mk(['соль', 'фа', 'ми', 'ре', 'до'], [7, 5, 4, 2, 0], [1, 1, 1, 1, 2]) },
      { id: 'thirds', kind: 'drill', focus: 'intervals', icon: 'ArrowUpDown', title: 'Прыжки на терцию', desc: 'Скачки вверх-вниз. Учат попадать в ноту без «подъезда».', notes: mk(['ма', 'ми', 'ма', 'ми', 'мо', 'ми', 'ма'], [0, 4, 0, 4, 7, 4, 0], [1, 1, 1, 1, 1, 1, 2]) },
      { id: 'scale', kind: 'drill', focus: 'accuracy', icon: 'ListMusic', title: 'Мажорная гамма', desc: 'Полная октава: до-ре-ми-фа-соль-ля-си-до.', notes: mk(['до', 'ре', 'ми', 'фа', 'соль', 'ля', 'си', 'до'], [0, 2, 4, 5, 7, 9, 11, 12], [1, 1, 1, 1, 1, 1, 1, 2]) },
      { id: 'fifth', kind: 'drill', focus: 'intervals', icon: 'Mountain', title: 'Квинта', desc: 'Прыжок на пять ступеней и обратно. Представь верхнюю ноту заранее.', notes: mk(['до', 'соль', 'до', 'соль', 'ми', 'до'], [0, 7, 0, 7, 4, 0], [1, 1, 1, 1, 1, 2]) },
      { id: 'song2', kind: 'song', focus: 'intervals', icon: 'Music', title: 'Рябинка, продолжение', desc: 'Вторая фраза песни: 13 нот, чередуются шаги и прыжки.', credit: CREDIT, beat: 0.8, notes: RYABINA_B },
    ],
  },
  {
    id: 'u3',
    title: 'Точная атака',
    subtitle: 'Чисто и сразу в ноту',
    color: '#f59e0b',
    level: 3,
    lessons: [
      { id: 'staccato', kind: 'drill', focus: 'attack', icon: 'Zap', title: 'Стаккато', desc: 'Короткие чёткие ноты «ту-ту-ту». Без подъезда снизу.', notes: mk(['ту'], [0, 0, 0, 0, 4, 4, 4, 4, 0], [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 2]) },
      { id: 'arpeggio', kind: 'drill', focus: 'intervals', icon: 'Piano', title: 'Арпеджио', desc: 'Трезвучие вверх и вниз. Расширяет диапазон.', notes: mk(['до', 'ми', 'соль', 'до', 'соль', 'ми', 'до'], [0, 4, 7, 12, 7, 4, 0], [1, 1, 1, 1, 1, 1, 2]) },
      { id: 'chroma', kind: 'drill', focus: 'accuracy', icon: 'Waves', title: 'Полутона', desc: 'Маленькие шаги по полутонам. Требует очень точного слуха.', notes: mk(['ла'], [0, 1, 2, 3, 4, 3, 2, 1, 0], [1, 1, 1, 1, 1, 1, 1, 1, 2]) },
      { id: 'octave', kind: 'drill', focus: 'intervals', icon: 'Rocket', title: 'Октава', desc: 'Прыжки на октаву и квинту. Самое трудное попадание.', notes: mk(['до', 'до', 'соль', 'до', 'соль', 'до'], [0, 12, 7, 12, 7, 0], [1, 1, 1, 1, 1, 2]) },
      { id: 'song3', kind: 'song', focus: 'stability', icon: 'Music', title: 'Рябинка целиком', desc: 'Обе фразы подряд, около 14 секунд. Держи дыхание.', credit: CREDIT, beat: 0.8, notes: RYABINA_FULL },
    ],
  },
  {
    id: 'u4',
    title: 'Мастерство',
    subtitle: 'Дыхание, долгие ноты и большие скачки',
    color: '#10b981',
    level: 4,
    lessons: [
      { id: 'long', kind: 'drill', focus: 'endurance', icon: 'Wind', title: 'Долгая нота', desc: 'Шесть долей на одной ноте. Не расходуй воздух сразу.', notes: mk(['а-а-а'], [0], [6]) },
      { id: 'twolong', kind: 'drill', focus: 'endurance', icon: 'Timer', title: 'Две долгие', desc: 'Две ноты по четыре доли с переходом без паузы.', notes: mk(['а', 'о'], [0, 4], [4, 4]) },
      { id: 'leaps', kind: 'drill', focus: 'intervals', icon: 'Mountain', title: 'Большие скачки', desc: 'Скачки на сексту и септиму от тоники. Для опытных.', notes: mk(['ла'], [0, 9, 0, 11, 0, 12, 0], [1, 1, 1, 1, 1, 1, 2]) },
      { id: 'minor', kind: 'drill', focus: 'accuracy', icon: 'ListMusic', title: 'Минорная гамма', desc: 'Натуральный минор: другие расстояния между нотами.', notes: mk(['до', 'ре', 'ми', 'фа', 'соль', 'ля', 'си', 'до'], [0, 2, 3, 5, 7, 8, 10, 12], [1, 1, 1, 1, 1, 1, 1, 2]) },
      { id: 'song4', kind: 'boss', focus: 'endurance', icon: 'Crown', title: 'Финал: Рябинка', desc: 'Медленно, с очень долгой последней нотой. Покажи всё, чему научился.', credit: CREDIT, beat: 0.95, notes: RYABINA_SLOW },
    ],
  },
]

export const UNITS = RAW.map((u) => ({
  ...u,
  lessons: u.lessons.map((l) => ({ ...l, unit: u.id, level: u.level, beat: l.beat ?? BEAT })),
}))
export const EXERCISES = UNITS.flatMap((u) => u.lessons)

// d = { baseline, sessions: [{id, score}], xp }, c = { streak }
const passedIds = (d) => {
  const s = new Set()
  for (const x of d.sessions || []) if (x.score >= PASS_SCORE) s.add(x.id)
  return s
}
const unitDone = (uid) => (d) => {
  const p = passedIds(d)
  return UNITS.find((u) => u.id === uid).lessons.every((l) => p.has(l.id))
}
const sessionsOf = (d) => d.sessions || []

export const ACHIEVEMENTS = [
  { id: 'first_test', icon: 'Mic', title: 'Первый шаг', desc: 'Пройти вокальный тест', check: (d) => !!d.baseline },
  { id: 'first_ex', icon: 'Sprout', title: 'Разминка', desc: 'Выполнить первое упражнение', check: (d) => sessionsOf(d).length >= 1 },
  { id: 'ten_ex', icon: 'Medal', title: 'Десятка', desc: 'Выполнить 10 упражнений', check: (d) => sessionsOf(d).length >= 10 },
  { id: 'score80', icon: 'Target', title: 'В яблочко', desc: 'Набрать 80+ в упражнении', check: (d) => sessionsOf(d).some((s) => s.score >= 80) },
  { id: 'perfect', icon: 'Gem', title: 'Чистейший тон', desc: 'Набрать 95+ в упражнении', check: (d) => sessionsOf(d).some((s) => s.score >= 95) },
  { id: 'streak3', icon: 'Flame', title: 'Три дня подряд', desc: 'Серия занятий 3 дня', check: (d, c) => c.streak >= 3 },
  { id: 'streak7', icon: 'Zap', title: 'Неделя без пропусков', desc: 'Серия занятий 7 дней', check: (d, c) => c.streak >= 7 },
  { id: 'lessons10', icon: 'Compass', title: 'Исследователь', desc: 'Сдать 10 разных уроков', check: (d) => passedIds(d).size >= 10 },
  { id: 'unit1', icon: 'Flag', title: 'Раздел 1', desc: 'Пройти «Первые звуки»', check: unitDone('u1') },
  { id: 'unit2', icon: 'Route', title: 'Раздел 2', desc: 'Пройти «Интервалы»', check: unitDone('u2') },
  { id: 'unit3', icon: 'Milestone', title: 'Раздел 3', desc: 'Пройти «Точная атака»', check: unitDone('u3') },
  { id: 'all_done', icon: 'Crown', title: 'Мастер', desc: 'Сдать все уроки карты', check: (d) => passedIds(d).size >= EXERCISES.length },
  { id: 'xp500', icon: 'Star', title: '500 XP', desc: 'Набрать 500 очков опыта', check: (d) => d.xp >= 500 },
]
