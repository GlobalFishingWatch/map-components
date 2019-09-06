import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import countryflag from 'countryflag'

class CountryFlag extends PureComponent {
  componentDidCatch(error, info) {
    console.error(error, info)
  }

  render() {
    // iso2 is deprecated, ignoring prop-types
    // eslint-disable-next-line react/prop-types
    const { iso, iso2, svg, size, margin } = this.props
    if (!iso && !iso2) {
      console.error(' Country flag iso (iso 3) or iso2 code is required')
      return null
    }
    if (iso2) {
      console.warn('iso2 parameter is deprecated, use iso instead')
    }
    let flag = null
    try {
      flag = countryflag(iso || iso2)
    } catch (e) {
      console.warn('Country flag error, incorrect iso code for:', iso || iso2)
    }
    if (!flag) return null

    return svg === true || flag.emoji === null ? (
      <img
        style={{ height: size, marginRight: margin.right, marginLeft: margin.left }}
        alt={flag.name}
        src={flag.svg}
      />
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
  margin: PropTypes.shape({
    left: PropTypes.string,
    right: PropTypes.string,
  }),
}

CountryFlag.defaultProps = {
  svg: false,
  size: '1em',
  margin: {
    left: '0.1em',
    right: '0.2em',
  },
}

export default CountryFlag
