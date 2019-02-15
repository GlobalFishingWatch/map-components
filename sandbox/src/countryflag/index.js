import React, { Component } from 'react'

import { CountryFlag } from '@globalfishingwatch/map-components'

class CountryFlagPage extends Component {
  render() {
    return (
      <div>
        <CountryFlag iso2="es" />
        <CountryFlag iso2="fr" />
        <CountryFlag iso2="ki" />
        <CountryFlag iso2="es" svg />
        <CountryFlag iso2="fr" svg />
        <CountryFlag iso2="ki" svg />
      </div>
    )
  }
}

export default CountryFlagPage
