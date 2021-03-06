import dayjs from 'dayjs'
import { getTime } from '../utils'

const getUnitLabel = (mUnit, baseUnit, availableWidth) => {
  /* eslint key-spacing: 0, no-multi-spaces: 0 */

  const getWeekFmt = (mUnit, isFirst = false) => {
    const mWeekEnd = mUnit.add(6, 'day')
    return `${mUnit.format('MMM')} ${mUnit.format('D')}-${mWeekEnd.format('D')} ${
      isFirst ? mUnit.format('YYYY') : ''
    }`
  }

  const FORMATS = {
    year: { isFirst: () => false, formats: [[0, 'YYYY']] },
    month: {
      isFirst: (fm) => fm.month() === 0,
      formats: [
        [200, 'MMMM YYYY'],
        [100, 'MMMM', 'MMM YYYY'],
        [0, 'MMM', 'MMM YY'],
      ],
    },
    week: {
      isFirst: (fm) => {
        return fm.date() === 1
      },
      formats: [
        [
          0,
          (mUnit) => {
            return getWeekFmt(mUnit)
          },
          (mUnit) => {
            return getWeekFmt(mUnit, true)
          },
        ],
      ],
    },
    day: {
      isFirst: (fm) => fm.date() === 1,
      formats: [
        [999, 'ddd D MMMM YYYY'],
        [200, 'ddd D MMMM'],
        [70, 'ddd D', 'MMM 1'],
        [0, 'D', 'MMM'],
      ],
    },
    hour: {
      isFirst: (fm) => fm.hour() === 0,
      formats: [
        [999, 'ddd D MMMM YYYY H[H]'],
        [0, 'H[H]', 'ddd D'],
      ],
    },
  }
  const unitFormat = FORMATS[baseUnit]
  let format
  for (let i = 0; i < unitFormat.formats.length; i += 1) {
    const formatMinWidth = unitFormat.formats[i][0]
    if (availableWidth > formatMinWidth) {
      format = unitFormat.formats[i]
      break
    }
  }

  const isFirst = unitFormat.isFirst(mUnit)
  const finalFormat = isFirst && format[2] ? format[2] : format[1]
  return typeof finalFormat === 'function' ? finalFormat(mUnit) : mUnit.format(finalFormat)
}

export const getUnitsPositions = (
  outerScale,
  outerStart,
  outerEnd,
  absoluteStart,
  absoluteEnd,
  baseUnit
) => {
  const startMs = Math.max(getTime(outerStart), getTime(absoluteStart))
  const endMs = Math.min(getTime(outerEnd), getTime(absoluteEnd))

  // BUFFER ??
  const mOuterStart = dayjs(startMs).startOf(baseUnit)
  const mOuterEnd = dayjs(endMs).endOf(baseUnit)

  const units = []
  const numUnitsOffset = getTime(outerEnd) > getTime(absoluteEnd) ? 0 : 1
  const numUnits = mOuterEnd.diff(mOuterStart, baseUnit) + numUnitsOffset

  let mUnit = mOuterStart
  let x = outerScale(mUnit)

  for (let ui = 0; ui <= numUnits; ui += 1) {
    const mUnitNext = mUnit.add(1, baseUnit)
    const xNext = outerScale(mUnitNext)

    const id = mUnit.format(
      {
        year: 'YYYY',
        month: 'YYYY-MM',
        week: 'YYYY-MM-DD',
        day: 'YYYY-MM-DD',
        hour: 'YYYY-MM-DD-HH',
      }[baseUnit]
    )

    const width = xNext - x
    const unit = {
      id,
      x,
      width,
      label: getUnitLabel(mUnit, baseUnit, width),
      hoverLabel: `${getUnitLabel(mUnit, baseUnit, Infinity)} - Zoom to ${baseUnit}`,
      start: mUnit.toISOString(),
      end: mUnitNext.subtract(1, 'hour').toISOString(), // this avoids being stuck when clicking on a day unit
    }
    units.push(unit)
    mUnit = mUnitNext
    x = xNext
  }

  return units
}
