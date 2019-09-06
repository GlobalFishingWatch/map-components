import React, { Component } from 'react'

import CountryFlag from '@globalfishingwatch/map-components/src/countryflag'

class CountryFlagPage extends Component {
  render() {
    return (
      <div>
        <CountryFlag iso="null" />
        <CountryFlag iso="fr" />
        <CountryFlag iso="ki" />
        <CountryFlag iso="es" svg />
        <CountryFlag iso="fr" svg />
        <CountryFlag iso="ki" svg />
        <br />
        <CountryFlag iso="esp" size="3em" />
        <CountryFlag iso="fra" size="3em" />
        <CountryFlag iso="kir" size="3em" />
        <CountryFlag iso="esp" size="3em" svg />
        <CountryFlag iso="fra" size="3em" svg />
        <CountryFlag iso="kir" size="3em" svg />
      </div>
    )
  }
}

export default CountryFlagPage
