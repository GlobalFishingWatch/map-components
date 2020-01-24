import React, { Component } from 'react'
import styles from './header.module.css'

import Header from '@globalfishingwatch/map-components/src/header'

class HeaderPage extends Component {
  render() {
    return (
      <div>
        <h1>Mini version</h1>
        <Header mini />
        <h1>Mini inverted version</h1>
        <Header />
        <h1>Inverted version</h1>
        <div className={styles.invertedContainer}>
          <Header inverted/>
        </div>
        <div className={styles.invertedBg}/>
      </div>
    )
  }
}

export default HeaderPage
