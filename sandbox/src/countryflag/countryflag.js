import React, { Component } from 'react'

import CountryFlag from '@globalfishingwatch/map-components/src/countryflag'

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
        <br />
        <CountryFlag iso2="es" size="3em" />
        <CountryFlag iso2="fr" size="3em" />
        <CountryFlag iso2="ki" size="3em" />
        <CountryFlag iso2="es" size="3em" svg />
        <CountryFlag iso2="fr" size="3em" svg />
        <CountryFlag iso2="ki" size="3em" svg />
      </div>
    )
  }
}

export default CountryFlagPage
