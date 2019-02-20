import React, { Component } from 'react'
import PropTypes from 'prop-types'
import countryflag from 'countryflag'

class CountryFlag extends Component {
  render() {
    const { iso2, svg } = this.props
    const flag = countryflag(iso2)
    return svg === true || flag.emoji === null ? (
      <img style={{ width: '18px' }} alt={flag.name} src={flag.svg} />
    ) : (
      <span role="img" aria-label={flag.name}>
        {flag.emoji}
      </span>
    )
  }
}

CountryFlag.propTypes = {
  iso2: PropTypes.string.isRequired,
  svg: PropTypes.bool,
}

CountryFlag.defaultProps = {
  svg: false,
}

export default CountryFlag
