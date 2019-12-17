import React from 'react'
// import PropTypes from 'prop-types'
import html from './template.html'

const template = { __html: html }

const Header = () => {
  return <div dangerouslySetInnerHTML={template} />
}

Header.propTypes = {}

export default Header
