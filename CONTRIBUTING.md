# How to Contribute

## Development Environment

1. Navigate to your `~/FoundryUserData/Data/systems` directory and clone this repo. Alternatively, place this anywhere and symlink it to `~/FoundryUserData/Data/systems/discworld-modiphius`.
2. To provide type and i18n support, this repository uses a postinstall script that symlinks your local Foundry installation. For this to work, copy `example-foundry-config.yaml` and rename it to `foundry-config.yaml`, then replace the value of the installPath field with your own Foundry install path.
3. Open a terminal in the repo and run `npm install` to install relevant package dependencies.
4. Download/Enable the recommended VS Code extensions (see **Tools** below).
5. The repo has several build scripts to facilitate development.
   - Build Compendia Packs: `npm run build:packs`
     - **Note:** this is only necessary if there have been recent changes to the source `JSON` files, or if you are working on this repo for the first time.
   - Watch for `SCSS` changes: `npm run dev`
6. Run Foundry V13. You should see Discworld in your systems. Create a world and you're off to the races.

## Tools

### Editor

- [VS Code](https://code.visualstudio.com/)

  - Of course, you are welcome to use whatever editor works best for you. However, we suggest extensions with VSCode in mind.

- Extensions:
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  - [i18n Ally](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally)

### Linters

- Javascript: [ESLint](https://eslint.org/docs/latest/)
- SCSS: VSCode built-in

### Formatters

- SCSS/JSON/YAML: [Prettier](https://prettier.io/docs/)
- Javascript/HTML/Handlebars: ESLint [Stylistic](https://eslint.style/guide/getting-started)

### Build

- [Sass](https://sass-lang.com/documentation/): For building CSS
- [Rollup](https://rollupjs.org/introduction/): For building Javascript
