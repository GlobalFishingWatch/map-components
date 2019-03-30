import React, { Component } from 'react'
import PropTypes from 'prop-types'
import countryflag from 'countryflag'

class CountryFlag extends Component {
  render() {
    const { iso, iso2, svg, size } = this.props
    if (!iso && !iso2) {
      console.error('Country flag iso (iso 3) or iso2 code is required')
      return null
    }
    if (iso2) {
      console.warn('iso2 parameter is deprecated, use iso instead')
    }
    const flag = countryflag(iso || iso2)
    return svg === true || flag.emoji === null ? (
      <img style={{ height: size, marginRight: '0.2em' }} alt={flag.name} src={flag.svg} />
    ) : (
      <span style={{ fontSize: size }} role="img" aria-label={flag.name}>
        {flag.emoji}
      </span>
    )
  }
}

CountryFlag.propTypes = {
  iso: PropTypes.string.isRequired,
  svg: PropTypes.bool,
  size: PropTypes.string,
}

CountryFlag.defaultProps = {
  svg: false,
  size: '1em',
}

export default CountryFlag
