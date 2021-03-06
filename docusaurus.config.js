/** @type {import('@docusaurus/types').DocusaurusConfig} */
module.exports = {
  title: 'apllodb ',
  tagline: 'A database interacting with people',
  url: 'https://apllodb.github.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'apllodb', // Usually your GitHub org/user name.
  projectName: 'apllodb.github.io', // Usually your repo name.
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en'],
  },
  themeConfig: {
    navbar: {
      // title: 'apllodb', // Logo shows the name
      logo: {
        alt: 'apllodb Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'doc',
          docId: 'top',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/apllodb/apllodb',
          label: 'GitHub',
          position: 'right',
        },
        {
          type: 'localeDropdown',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} Eukarya, Inc. Built with Docusaurus.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl:
            'https://github.com/apllodb/apllodb.github.io',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
