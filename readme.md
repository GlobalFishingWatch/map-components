# gfw-components

Set of components used in global fishing watch map frontend.

## Install

```bash
yarn add gfw-components
```

## Usage

```jsx
import { MiniGlobe } from '@globalfishingwatch/map-components'

class MyApp extends Component {
  render() {
    return <MiniGloble />
  }
}
```

## Develop

```bash
git clone git@github.com:GlobalFishingWatch/map-components.git
cd map-components
yarn install
yarn link
yarn start
```

```bash
cd workspace
yarn install
yarn link "@globalfishingwatch/map-components"
yarn start
```

## Release

Using [zeit release](https://github.com/zeit/release) to make our life easier, so just run

```bash
npx release major|minor|patch
```

and it will update the package.json, generate the github release and push your changes and finally:

```bash
yarn publish
```

## License

MIT ©
