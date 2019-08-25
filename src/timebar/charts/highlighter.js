import React, { useMemo } from 'react'
import styles from './highlighter.module.css'

const Highlighter = ({ outerScale, graphHeight, hoverStart, hoverEnd }) => {
  const left = outerScale(hoverStart)
  const width = outerScale(hoverEnd) - left
  return (
    <div
      className={styles.highlighter}
      style={{
        left,
        width,
        height: graphHeight,
      }}
    ></div>
  )
}

export default Highlighter
