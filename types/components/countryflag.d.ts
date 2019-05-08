import * as React from 'react'

export interface CountryFlagMargin {
  left?: string
  righ?: string
}

export interface CountryFlagProps {
  iso: string
  svg?: boolean
  size?: string
  margin?: CountryFlagMargin
}

export default class CountryFlag extends React.PureComponent<CountryFlagProps, any> {
  render(): JSX.Element
}
