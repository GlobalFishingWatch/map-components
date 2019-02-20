import React, { Component } from 'react'
import PropTypes from 'prop-types'
import countryflag from 'countryflag'

class CountryFlag extends Component {
  render() {
    const { iso2, svg, size } = this.props
    const flag = countryflag(iso2)
    return svg === true || flag.emoji === null ? (
      <img style={{ height: size }} alt={flag.name} src={flag.svg} />
    ) : (
      <span style={{ fontSize: size }} role="img" aria-label={flag.name}>
        {flag.emoji}
      </span>
    )
  }
}

CountryFlag.propTypes = {
  iso2: PropTypes.string.isRequired,
  svg: PropTypes.bool,
  size: PropTypes.string,
}

CountryFlag.defaultProps = {
  svg: false,
  size: '1em',
}

export default CountryFlag
