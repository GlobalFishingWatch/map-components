# GFW map components

Set of components used in global fishing watch map frontend.

## Install & Usage

Check out the [online documentation](http://globalfishingwatch.io/map-components/)

## Develop

```bash
git clone git@github.com:GlobalFishingWatch/map-components.git
cd map-components
yarn install
yarn link
yarn start
```

```bash
cd sandbox
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
