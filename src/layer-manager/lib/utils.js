export function hasAllRequiredParams(params) {
  const requiredParams = []
  let hasRequiredParams = true
  requiredParams.forEach((param) => {
    if (!params[param]) {
      hasRequiredParams = false
      console.error(`The ${param} param is required for layer manager`)
    }
  })
  return hasRequiredParams
}
