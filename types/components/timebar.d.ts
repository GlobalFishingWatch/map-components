import * as React from 'react'

export interface TimebarProps {
  onChange: (...args: any[]) => any
  absoluteStart: string
  absoluteEnd: string
  enablePlayback?: boolean
}

export default class Timebar extends React.Component<TimebarProps, any> {
  render(): JSX.Element
}
