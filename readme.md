# gfw-components

Set of components used in global fishing watch map frontend.

## Install

```bash
yarn add gfw-components
```

## Usage

```jsx
import { MiniGloble } from 'gfw-coponents';

class MyApp extends Component {
  render () {
    return (
      <MiniGloble />
    )
  }
}
```

## Develop

```bash
git clone https://github.com/GlobalFishingWatch/map-components
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


## License

MIT ©
