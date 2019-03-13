const getTimebarRangeAuto = (auto) => {
  const ONE_DAY = 24 * 60 * 60 * 1000
  const daysEndInnerOuterFromToday = auto.daysEndInnerOuterFromToday || 4
  const daysInnerExtent = auto.daysInnerExtent || 30
  // today - n days
  const now = new Date()
  // Minus the timezone offset to normalize dates
  const end = now.getTime() - now.getTimezoneOffset() * 60000 - daysEndInnerOuterFromToday * ONE_DAY
  // inner should be 30 days long
  const start = end - daysInnerExtent * ONE_DAY
  // start outer at beginning of year
  return { start, end }
}

const getTimebarRangeDefault = (range) => {
  return {
    start: range.innerExtent[0],
    end: range.innerExtent[1],
  }
}

export const getTimebarRangeByWorkspace = (timeline) => {
  return timeline.auto !== undefined
    ? getTimebarRangeAuto(timeline.auto)
    : getTimebarRangeDefault(timeline)
}
