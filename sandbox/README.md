## Working place to test and show examples of gfw-components

[CRA](https://github.com/facebook/create-react-app) used to test and develop gfw-map-components.

It uses the simplest version of react-router to handle a page for every component. So every component will be shown independently.

To start testing run:

```bash
yarn install
```

```bash
yarn start
```

Troubleshooting
| Create React App complaining about different dependencies versions:

It happens as different version is found higher in the tree as this is a subproject folder, to fix it:
    1. Create .env file
    2. Add `SKIP_PREFLIGHT_CHECK=true`
    3. Run `yarn start` again

### Test workspace

The map sandbox has the possibility to "livereload" a workspace. Tou will need remote URL (with CORS enabled) or alternatively a local workskpace than can be served using `npm start serve-workspace`, then using a URL such as `http://localhost:3333/workspace.json`