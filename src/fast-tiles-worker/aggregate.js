const dayToTime = (day) => day * 24 * 60 * 60 * 1000

const aggregate = (tileLayer, { delta, quantizeOffset }) => {
  const features = []

  for (let f = 0; f < tileLayer.length; f++) {
    const rawFeature = tileLayer.feature(f)
    const values = rawFeature.properties
    const feature = {
      type: 'Feature',
      properties: {},
    }

    delete values.cell

    const finalValues = {}
    let currentValue = 0
    let j = 0
    const allTimestamps = Object.keys(values).map((t) => parseInt(t))
    const minTimestamp = Math.min(...allTimestamps)
    const maxTimestamp = Math.max(...allTimestamps)

    for (let d = minTimestamp; d < maxTimestamp + delta; d++) {
      const key = d.toString()
      const headValue = values[key] ? parseInt(values[key]) : 0
      currentValue += headValue
      // if (f === 0) {
      //   console.log(d)
      // }

      // if not yet at aggregation delta, just keep up aggregating, do not write anything yet
      j++
      if (j < delta) {
        continue
      }

      // substract tail value
      const tailValueIndex = d - delta
      const tailValueKey = tailValueIndex.toString()
      let tailValue = tailValueIndex > 0 ? values[tailValueKey] : 0
      tailValue = tailValue !== undefined ? parseInt(tailValue) : 0
      currentValue -= tailValue
      // if (f === 0) {
      //   console.log(currentValue)
      // }

      if (currentValue > 0) {
        const finalIndex = d - delta - quantizeOffset + 1
        finalValues[finalIndex.toString()] = currentValue
      }
    }
    // if (f === 0) {
    //   console.log(finalValues)
    // }
    feature.properties = finalValues

    features.push(feature)
  }

  return features
}

export default aggregate
