import Pbf from 'pbf'
import { VectorTile } from '@mapbox/vector-tile'
import geojsonhint from '@mapbox/geojsonhint'
import validation from 'geojson-validation'
import tilebelt from '@mapbox/tilebelt'
import aggregate, { rawTileToIntArrays } from '../aggregate'

const fs = require('fs')
const { performance } = require('perf_hooks')

const tileset = 'carriers'
const quantizeOffset = new Date('2017-01-01T00:00:00.000Z').getTime() / 1000 / 60 / 60 / 24 // 17167

let tileRaw
let tileLayer
let arrayBuffers
const tileBBox = tilebelt.tileToBBOX([2, 3, 2])

beforeEach(() => {
  tileRaw = fs.readFileSync('./src/fast-tiles-worker/test/mocks/carriers-2-3-2.pbf')
  const tile = new VectorTile(new Pbf(tileRaw))
  tileLayer = tile.layers[tileset]
  arrayBuffers = rawTileToIntArrays(tileRaw, { tileset, quantizeOffset })
})

test('Builds intermediate array buffer', () => {
  const arrayBuff = rawTileToIntArrays(tileRaw, { tileset, quantizeOffset })

  // @ feature 0: 17716 --> 0 : 1
  // @ feature 906: 17267 --> 100: 2,

  expect(arrayBuff[0]).toBe(30) // cell
  expect(arrayBuff[1]).toBe(17716) // start
  expect(arrayBuff[2]).toBe(17716) // max
  expect(arrayBuff[3]).toBe(1) // value
  expect(arrayBuff[4]).toBe(34) // cell
  expect(arrayBuff[5]).toBe(17889) // start
  expect(arrayBuff[6]).toBe(17889) // max
  expect(arrayBuff[7]).toBe(1) // value
})

test('Has the correct number of features', () => {
  const aggregated = aggregate(arrayBuffers, { delta: 1, quantizeOffset, tileBBox })

  expect(aggregated.features.length).toBe(1321)
})

test('Big tile, big delta, single frame mode, last feature', () => {
  const bigTileRaw = fs.readFileSync('./src/fast-tiles-worker/test/mocks/carriers-1-1-0.pbf')
  const t0 = performance.now()
  const bigTileArrayBuffers = rawTileToIntArrays(bigTileRaw, { tileset, quantizeOffset })
  console.log('Big tile/big delta Bufferisation done in ', performance.now() - t0)

  // const tile = new VectorTile(new Pbf(bigTileRaw))
  // tileLayer = tile.layers[tileset]
  // for (let index = 0; index < tileLayer.length; index++) {
  //   if (Object.keys(tileLayer.feature(index).properties).length < 10)
  //     console.log(tileLayer.feature(index).properties, index)
  // }

  const t = performance.now()
  const agg = aggregate(bigTileArrayBuffers, {
    delta: 1000,
    quantizeOffset,
    tileBBox: tilebelt.tileToBBOX([1, 1, 0]),
  })
  console.log('Big tile/big delta Aggregation done in ', performance.now() - t)

  // { '17688': 1, cell: 4081 } 2699
  //  { '17345': 1, '17618': 1, '18041': 2, '18123': 1, cell: 4095 } 2713
  expect(agg.features[2699].properties[17688 - quantizeOffset]).toBe(1)
  expect(agg.features[2713].properties[17345 - quantizeOffset]).toBe(5)

  const t2 = performance.now()
  const aggSingleFrame = aggregate(bigTileArrayBuffers, {
    delta: 1000,
    quantizeOffset,
    singleFrameStart: 0,
    tileBBox: tilebelt.tileToBBOX([1, 1, 0]),
  })
  console.log('Big tile/big delta (single frame) Aggregation done in ', performance.now() - t2)
  expect(aggSingleFrame.features[2699].properties.value).toBe(1)
  expect(aggSingleFrame.features[2713].properties.value).toBe(5)

  // expect(false).toBe(true)
})

test('Return a correct grid', () => {
  let agg = aggregate(arrayBuffers, { delta: 1, quantizeOffset, tileBBox })
  expect(agg.features.length).toBe(tileLayer.length)

  agg = aggregate(arrayBuffers, { delta: 1, quantizeOffset, tileBBox, skipOddCells: true })

  // 0,46875
  // 0,46875
  // cell: 30 - bbox lng range: 0 - 90
  const lngCell30 = agg.features[0].geometry.coordinates[0][0][0]
  expect(lngCell30 / tileBBox[2]).toBe(0.46875)
})

test('Return valid geometries/GeoJSON', () => {
  const gridded = aggregate(arrayBuffers, { delta: 1, quantizeOffset, tileBBox })
  let errors = geojsonhint.hint(gridded)
  if (errors.length) {
    console.log(errors)
  }
  expect(validation.valid(gridded)).toBe(true)
  expect(validation.isPolygon(gridded.features[100].geometry)).toBe(true)

  const blob = aggregate(arrayBuffers, { delta: 1, quantizeOffset, tileBBox, geomType: 'blob' })
  errors = geojsonhint.hint(blob)
  if (errors.length) {
    console.log(errors)
  }
  expect(validation.valid(blob)).toBe(true)
  expect(validation.isPoint(blob.features[100].geometry)).toBe(true)
})

test('Pick a value (delta 1)', () => {
  // console.log(tileLayer.feature(0).properties)
  // console.log(tileLayer.feature(10).properties)
  // console.log(tileLayer.feature(50).properties)
  // for (let f = 0; f < tileLayer.length; f++) {
  //   const p = tileLayer.feature(f).properties
  //   if (Object.keys(p).length > 30) {
  //     console.log(f)
  //     console.log(p)
  //   }
  // }

  const testFeatureIndex = 0
  const testValueDay = 17716

  const aggregated = aggregate(arrayBuffers, { delta: 1, quantizeOffset, tileBBox })

  // // at 549, 1
  const testValueDayAtOffset = (testValueDay - quantizeOffset).toString()
  expect(aggregated.features[testFeatureIndex].properties[testValueDayAtOffset]).toBe(1)
})

test('Agg is correct with isolated value and long delta', () => {
  const testFeatureIndex = 0
  const testValueDay = 17716
  const testValueDayAtOffset = testValueDay - quantizeOffset
  const delta = 30

  // console.log(testValueDayAtOffset)
  // console.log(aggregated.features[testFeatureIndex].properties)

  const t = performance.now()
  const aggregated = aggregate(arrayBuffers, { delta, quantizeOffset, tileBBox })
  console.log('Medium Aggregation done in ', performance.now() - t)

  expect(aggregated.features[testFeatureIndex].properties[testValueDayAtOffset.toString()]).toBe(1)
  expect(
    aggregated.features[testFeatureIndex].properties[(testValueDayAtOffset - 1).toString()]
  ).toBe(1)
  expect(
    aggregated.features[testFeatureIndex].properties[(testValueDayAtOffset - delta + 1).toString()]
  ).toBe(1)
  expect(
    aggregated.features[testFeatureIndex].properties[(testValueDayAtOffset - delta).toString()]
  ).toBeUndefined()
})

test('Aggregates several days', () => {
  // @ index 906 / cell 3505
  //     '17167': 2,
  //     '17168': 1,
  //     '17169': 1,
  //     '17170': 1,
  //     '17171': 1,
  //     '17172': 1
  const testValueDay = 17167
  const testFeatureIndex = 906

  const t = performance.now()
  const aggregated = aggregate(arrayBuffers, { delta: 3, quantizeOffset, tileBBox })
  console.log('Small Aggregation done in ', performance.now() - t)
  const testValueDayAtOffset = testValueDay - quantizeOffset

  expect(aggregated.features[testFeatureIndex].properties[testValueDayAtOffset.toString()]).toBe(4)
  expect(
    aggregated.features[testFeatureIndex].properties[(testValueDayAtOffset + 1).toString()]
  ).toBe(3)
  expect(
    aggregated.features[testFeatureIndex].properties[(testValueDayAtOffset + 2).toString()]
  ).toBe(3)
})

test('Aggregates long time', () => {
  // @ 965

  // '17179': 4,
  // '17180': 4,
  // '17181': 4,
  // '17182': 3,
  // '17183': 4,
  // '17184': 4,
  // '17185': 4,
  // '17186': 3,
  // '17187': 3,
  // '17188': 3,
  // '17189': 3,
  // '17190': 3,
  // '17191': 4,
  // '17192': 4,
  // '17193': 3,
  // '17194': 3,
  // '17195': 3,
  // '17196': 3,
  // '17197': 4,
  // '17198': 4,
  // '17199': 3,
  // '17200': 3,
  // '17201': 2,
  // '17202': 2,
  // '17203': 2,
  // '17204': 2,
  // '17205': 2,
  // '17206': 2,
  // '17207': 2,
  // '17208': 2,
  // '17209': 3,
  // '17210': 3,
  // '17211': 3,
  // '17212': 3,
  // '17213': 3,
  // '17214': 3,
  // '17215': 3,
  // '17216': 3,
  // '17217': 3,
  // '17218': 3,
  // '17219': 3,
  // '17220': 4,
  // '17221': 5,
  // '17222': 5,
  // '17223': 5,
  // '17224': 5,
  // '17225': 5,
  // '17226': 4,
  // '17227': 4,
  // '17228': 4,
  // '17229': 4,
  // '17230': 4,
  // '17231': 5,
  // '17232': 5,
  // '17233': 5,
  // '17234': 6,
  // '17235': 6,
  // '17236': 7,
  // '17237': 7,
  // '17238': 7,
  // '17239': 5,
  // '17240': 3,
  // '17241': 3,
  // '17242': 3,
  // '17243': 3,
  // '17244': 3,
  // '17245': 2,
  // '17246': 1,
  // '17247': 1,
  // '17250': 1,
  // '17251': 1,
  // '17252': 1,
  // '17253': 1,
  // '17254': 1,
  // '17255': 1,
  // '17256': 1,
  // '17257': 1,
  // '17258': 1,
  // '17259': 1,
  // '17260': 1,
  // '17261': 1,
  // '17262': 1,
  // '17263': 1,
  // '17264': 1,
  // '17265': 1,
  // '17266': 1,
  // '17267': 2,
  // '17268': 2,
  // '17269': 2,
  // '17270': 2,
  // '17271': 2,
  // '17272': 2,
  // '17273': 2,
  // '17274': 3,
  // '17275': 3,
  // '17276': 3,
  // '17277': 3,
  // '17278': 3,
  // '17279': 3,
  // '17280': 3,
  // '17281': 2,
  // '17282': 3,
  // '17283': 3,
  // '17284': 3,
  // '17285': 3,
  // '17286': 3,
  // '17287': 3,
  // '17288': 3,
  // '17289': 2,
  // '17290': 2,
  // '17291': 2,
  // '17292': 2,
  // '17293': 2,
  // '17294': 3,
  // '17295': 3,
  // '17296': 3,
  // '17297': 3,
  // '17298': 3,
  // '17299': 2,
  // '17300': 2,
  // '17301': 2,
  // '17302': 3,
  // '17303': 4,
  // '17304': 4,
  // '17305': 4,
  // '17306': 4,
  // '17307': 4,
  // '17308': 4,
  // '17309': 5,
  // '17310': 5,
  // '17311': 5,
  // '17312': 5,
  // '17313': 5,
  // '17314': 5,
  // '17315': 5,
  // '17316': 4,
  // '17317': 4,
  // '17318': 4,
  // '17319': 4,
  // '17320': 4,
  // '17321': 4,
  // '17322': 3,
  // '17323': 3,
  // '17324': 3,
  // '17325': 3,
  // '17326': 3,
  // '17327': 3,
  // '17328': 3,
  // '17329': 3,
  // '17330': 3,
  // '17331': 4,
  // '17332': 3,
  // '17333': 3,
  // '17334': 3,
  // '17335': 1,
  // '17345': 1,
  // '17346': 2,
  // '17347': 2,
  // '17348': 3,
  // '17349': 3,
  // '17350': 3,
  // '17351': 3,
  // '17352': 4,
  // '17353': 4,
  // '17354': 3,
  // '17355': 3,
  // '17356': 2,
  // '17357': 2,
  // '17358': 2,
  // '17359': 2,
  // '17360': 2,
  // '17361': 2,
  // '17362': 2,
  // '17363': 2,
  // '17364': 2,
  // '17365': 1,
  // '17366': 1,
  // '17374': 1,
  // '17375': 1,
  // '17376': 1,
  // '17377': 1,
  // '17378': 1,
  // '17379': 1,
  // '17380': 1,
  // '17381': 1,
  // '17382': 1,
  // '17383': 1,
  // '17384': 1,
  // '17385': 1,
  // '17386': 1,
  // '17387': 1,
  // '17388': 1,
  // '17389': 1,
  // '17390': 1,
  // '17391': 1,
  // '17392': 1,
  // '17393': 1,
  // '17394': 1,
  // '17395': 1,
  // '17396': 1,
  // '17397': 1,
  // '17398': 1,
  // '17399': 1,
  // '17400': 1,
  // '17401': 1,
  // '17402': 1,
  // '17403': 1,
  // '17404': 1,
  // '17405': 1,
  // '17406': 1,
  // '17438': 1,
  // '17439': 1,
  // '17440': 1,
  // '17441': 1,
  // '17442': 2,
  // '17443': 2,
  // '17444': 3,
  // '17445': 3,
  // '17446': 3,
  // '17447': 3,

  // const p = tileLayer.feature(965).properties
  // let v = 0
  // Object.keys(p).forEach((k) => {
  //   const kn = parseInt(k)
  //   if (kn >= 17179 && kn < 17179 + 200) {
  //     v += p[k]
  //   }
  // })
  // console.log(v)

  const testValueDay = 17179
  const testFeatureIndex = 965

  const t = performance.now()
  const aggregated = aggregate(arrayBuffers, { delta: 200, quantizeOffset, tileBBox })
  console.log('Big Aggregation done in ', performance.now() - t)
  const testValueDayAtOffset = testValueDay - quantizeOffset

  expect(aggregated.features[testFeatureIndex].properties[testValueDayAtOffset.toString()]).toBe(
    535
  )
  expect(
    aggregated.features[testFeatureIndex].properties[(testValueDayAtOffset + 1).toString()]
  ).toBe(535 - 4 + 1)
  // expect(aggregated[testFeatureIndex].properties[(testValueDayAtOffset + 2).toString()]).toBe(3)
})
