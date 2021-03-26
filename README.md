<div align="center">

# hugo-installer

**Installs [Hugo](https://gohugo.io/) into your repository.**

</div>

<br><br>

## What it does

**[Hugo](https://gohugo.io/)** is one of the most popular static site generators. Now, when it comes to web development, we usually select
**[npm](https://www.npmjs.com/)** as our dependency management solution. **Hugo**, however, is a tool written in [Go](https://golang.org/).
Therefore, Hugo is not integrated into the npm module ecosystem - but instead delivered as a binary.

The **Hugo Installer** is here to help! It's a small node script which can be used to fetch a specific Hugo binary, for instance using the
`postinstall` hook within a `package.json` file.

<br><br><br>

## How to install

You can get the **hugo-installer** via **npm** by adding it as a new _devDependency_ to your `package.json` file and running
`npm install`. Alternatively, run the following command:

```bash
npm install hugo-installer --save-dev
```

### Requirements

- **hugo-installer** requires **NodeJS 10** (or higher) to be installed

<br><br><br>

## How to use

We recommended to use the **hugo-installer** within the `postinstall` hook of a project's `package.json` file.

<br>

### Configure hugo version (required)

The Hugo version can be set using the `--version` CLI parameter. For example:

```json
{
  "scripts": {
    "postinstall": "hugo-installer --version 0.46"
  }
}
```

You can also use the extended version of Hugo:

```json
{
  "scripts": {
    "postinstall": "hugo-installer --version 0.46 --extended"
  }
}
```

Bonus tip: The `--version` CLI parameter can also be an object path to some value defined in the `package.json` file. This allows for the
hugo version to be configured someplace else, e.g. in a `otherDependencies` object:

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

### Configure binary path (optional)

The `--destination` CLI parameter can be used to define the folder into which the Hugo binary will be placed. This parameter is optional,
the default destination path is `bin/hugo`. For example:

```json
{
  "scripts": {
    "postinstall": "hugo-installer --version 0.46 --destination bin/hugo"
  }
}
```

> Don't forget to add the destination path to your `.gitignore` file!

<br><br><br>

## Using the Hugo binary

Once fetched, the hugo binary can be used directly from your favourite command line. For example:

```bash
bin/hugo/hugo.exe --config=hugo.config.json
```

Alternatively, one might also want to integrate Hugo in a NodeJS build script, or a NodeJS-based build tool such as
**[Gulp](https://gulpjs.com/)**. You can execute the Hugo binary using the `spawn` command. For example:

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
