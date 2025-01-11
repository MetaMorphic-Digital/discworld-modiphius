# Discworld - Quickstart

> **Note:** This system is a work-in-progress and in a _pre-release_ state. Until it is complete, this `README` will contain information for testing/contributing (i.e. getting a development environment set up). When the system is compelete, this `README` will be updated to contain general information about the system, and instructions for contributing will be moved to a file called `CONTRIBUTING.md` in the root of the repository.

## Development Environment

1. Navigate to your `~/FoundryUserData/Data/systems` directory and clone this repo.
2. Open a terminal in the repo and run `npm i` to install package dependencies (see NPM Packages)
3. Download/Enable the recommended VS Code extensions.
4. The repo uses `scss` so you must first compile the `css` (to the directory `styles/main.css`) either using `vite` or `sass`.
   - Vite: `npx vite build --watch`.
   - Sass: `npm run sass` (see package.json for full script).
5. Run Foundry V12. You should see Discworld in your systems. Create a world and you're off to the races.

## Tools

### Editor

- VS Code (Of course you are welcome to use whatever works best for you. However, I will be suggesting extensions with VSCode in mind).
- **Extensions**:

  - [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig)
  - [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  - [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
  - [DJLint](https://marketplace.visualstudio.com/items?itemName=monosans.djlint)

  _**Note**: For all extensions follow the documentation on their websites for how to properly install. DJLint in particular is different than Prettier/ESLint, because it doesn't use NPM._

### Linters

- Javascript: ESLint
- Handlebars: DJLint
- Scss: VSCode Built-in (may move to stylelint in the future)

### Formatters

- Javascript/Scss: Prettier
- Handlebars: DJLint

### Build

- Sass - For building CSS
- Vite - Also for building CSS, but have plans to use more of its features in the future.
