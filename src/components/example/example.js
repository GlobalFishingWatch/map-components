import React, { Component } from 'react'
import PropTypes from 'prop-types'

import styles from './example.css'

export default class ExampleComponent extends Component {
  render() {
    const { name } = this.props
    return <div className={styles.box}>Hi {name}, this is global fishing watch components.</div>
  }
}

ExampleComponent.propTypes = {
  name: PropTypes.string,
}
