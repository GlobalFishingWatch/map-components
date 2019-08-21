export const flatObjectArrays = (object = {}) => {
  let objectParsed = {}
  Object.keys(object).forEach((key) => {
    if (object[key] && object[key].length) {
      const arrayObject = Object.fromEntries(
        object[key].map((source) => {
          const { id, ...rest } = source
          return [id, rest]
        })
      )
      objectParsed = { ...objectParsed, ...arrayObject }
    } else {
      objectParsed[key] = object[key]
    }
  })
  return objectParsed
}

export const flatObjectToArray = (object) =>
  Object.values(object).flatMap((layerGroup) => layerGroup)
