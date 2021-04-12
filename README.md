<div align="center">

# hugo-installer

**Installs [Hugo](https://gohugo.io/) into your repository.**

</div>

<br><br>

## What it does

**[Hugo](https://gohugo.io/)** is one of the most popular static site generators. In the world of web development we usually choose
**[npm](https://www.npmjs.com/)** as our dependency management solution. **Hugo**, however, is written in [Go](https://golang.org/) - and
thus not integrated into the npm module ecosystem. Instead, users are asked to install Hugo globally on their systems. Suboptimal, really.

But don't you worry, **Hugo Installer** is here to help! It's a small Node.js script which you can use to fetch the correct Hugo binary for
your system, e.g. via a `postinstall` hook within a `package.json` file. Neat!

<br><br><br>

## How to install

You can get the **hugo-installer** via **npm** by adding it as a new _devDependency_ to your `package.json` file and running
`npm install`. Alternatively, run the following command:

```bash
npm install hugo-installer --save-dev
```

### Requirements

- **hugo-installer** requires **NodeJS 12** (or higher) to be installed

<br><br><br>

## How to use

We recommended to use **hugo-installer** as part of your `postinstall` hook within your project's `package.json` file.

<br>

### Configure hugo version (required)

The Hugo version can be set using the `--version` CLI parameter. For example:

```json
{
  "scripts": {
    "postinstall": "hugo-installer --version 0.82.0"
  }
}
```

> Important: Make sure to use the exact version number as used in the
> [official Hugo GitHub releases](https://github.com/gohugoio/hugo/releases) (e.g. trailing zeros that exist or do not exist)

You can also use the extended version of Hugo (for some operating systems!) by specifying the `--extended` CLI parameter. For example:

```json
{
  "scripts": {
    "postinstall": "hugo-installer --version 0.46 --extended"
  }
}
```

**Bonus tip:** The `--version` CLI parameter can also be an object path to some value defined in your `package.json` file. This allows for the
Hugo version to be configured someplace else, e.g. in a `otherDependencies` object. For example:

```json
{
  "otherDependencies": {
    "hugo": "0.46"
  },
  "scripts": {
    "postinstall": "hugo-installer --version otherDependencies.hugo"
  }
}
```

<br>

### Full list of CLI parameters

The following lists all available CLI parameters and their respective default values.

| CLI parameter          | Description                                                                                                                                                                                                           | Default value                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `--arch [arch]`        | System architecture that the binary will run on. It is recommended to use auto-detect by not using this option.                                                                                                       | Auto-configured on runtime using `os.arch()`          |
| `--destination [path]` | Path to the folder into which the binary will be put. Make sure to add this path to your `.gitignore` file.                                                                                                           | `bin/hugo`                                            |
| `--downloadUrl [url]`  | Source base URL from where the Hugo binary will be fetched. By default, GitHub will be used. When using a custom URL, make sure to replicate GitHub release asset URLs and append a trailing slash to the custom URL. | `https://github.com/gohugoio/hugo/releases/download/` |
| `--extended`           | Download the extended version of Hugo.                                                                                                                                                                                | `false`                                               |
| `--force`              | Force clean install of Hugo, ignoring already installed / cached binaries.                                                                                                                                            | `false`                                               |
| `--os [os]`            | Operating system that the binary should run on. It is recommended to use auto-detect by not using this option.                                                                                                        | Auto-configured on runtime using `os.platform()`      |
| `--skipChecksumCheck`  | Skip checksum checks for downloaded binaries. It is recommended to leave this option enabled.                                                                                                                         | `true`                                                |
| `--skipHealthCheck`    | Skip health checks for downloaded binaries. It is recommended to leave this option enabled.                                                                                                                           | `true`                                                |
| `--version [version]`  | Hugo version to install, or path to package.json entry with the version. Make sure to use the exact version number as defined in the official Hugo GitHub releases.                                                   | _n/a_                                                 |

You can always take a look at all available CLI parameters using the `--help` CLI parameter. For example:

```bash
hugo-installer --help
```

<br><br><br>

## Using the Hugo binary

Once fetched, the hugo binary can be used directly from your favourite command line or as part of an npm script. For example:

```bash
bin/hugo/hugo --config=hugo.config.json
```

One might also want to integrate Hugo in a NodeJS build script, or a NodeJS-based build tool such as **[Gulp](https://gulpjs.com/)**. You
can execute the Hugo binary using the Node.JS `spawn` function. For example:

```js
const path = require('path');
const spawn = require('child_process').spawn;

// Use Hugo
spawn(path.resolve(process.cwd(), 'bin', 'hugo', 'hugo'), [`--config=hugo.config.json`], {
  stdio: 'inherit',
}).on('close', () => {
  // Callback
});
```
