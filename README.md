# [apllodb](https://github.com/apllodb/apllodb) documentation

This website is built using [Docusaurus 2](https://docusaurus.io/).

Documents are deployed to: <https://apllodb.github.io>

## Installation

```console
yarn install
```

## Local Development

```console
yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

## Translation (i18n)

- Japanese (default locale): `docs/*.md`
- English: `i18n/en/docusaurus-plugin-content-docs/current/*.md`

Local development does not properly work for i18n.
To check English translation locally, use the following command:

```console
yarn run start -- --locale en
```

## Branch Management

- `main`: Documentation source codes.
- `(any feature branch)`: Merged into main via PRs.
- `gh-pages`: Compiled docs.

## Deployment

GitHub Actions is configured to deploy docs automatically on main branch update (usually a PR is merged).
