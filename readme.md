# GFW map components

[![npm version](https://badge.fury.io/js/%40globalfishingwatch%2Fmap-components.svg)](https://badge.fury.io/js/%40globalfishingwatch%2Fmap-components)

Set of components used in global fishing watch map frontend.

## Using the components

Check out the [online documentation](http://globalfishingwatch.io/map-components/)

## Components structure
```
component
│   component.js    // Component logic
│   component.css   // Component styles
│   component.mdx   // Generates component documentation
│   index.js // Optional file that generates a new folder below the components one
│            // and exports component code and any possible child component dependencies
│            // This makes possible components code splitting easily with
│            // import Component from '@globalfishingwatch/map-components/components/[component-name]
│
└───subcomponent
│       subcomponent.js
│       subcomponent.css
└───────────────────────
```

## Develop with components

In order to do easier edits on the components while developping parent apps, use this repo locally:

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

## Documentation

[Docz](https://www.docz.site/) is used to include live components documentation using mdx.

This playground could be used locally to test the components running:

```bash
yarn docz:dev
```

## Release

Using [zeit release](https://github.com/zeit/release) to make our life easier, so just run

```bash
npx release major|minor|patch
```

and it will update the package.json, generate the github release and push your changes and finally:

```bash
npm publish
```

(⚠️ don't forget to bump dependency version on parent project if needed!) 

## License

MIT ©
