<div align="center">

# hugo-installer

**Installs [Hugo](https://gohugo.io/) into your repository.**

[![npm version](https://img.shields.io/npm/v/hugo-installer.svg?maxAge=3600&style=flat)](https://www.npmjs.com/package/hugo-installer)
[![dependency status](https://img.shields.io/david/dominique-mueller/hugo-installer.svg?maxAge=3600&style=flat)](https://david-dm.org/dominique-mueller/hugo-installer)
[![travis ci build status](https://img.shields.io/travis/dominique-mueller/hugo-installer/master.svg?maxAge=3600&style=flat)](https://travis-ci.org/dominique-mueller/hugo-installer)
[![license](https://img.shields.io/npm/l/hugo-installer.svg?maxAge=3600&style=flat)](https://github.com/dominique-mueller/hugo-installer/LICENSE)

</div>

<br><br>

## What it does

**[Hugo](https://gohugo.io/)** is one of the most popular static site generators. Now, when it comes to web development, we usually select
**[npm](https://www.npmjs.com/)** as our dependency management solution. **Hugo**, however, is a tool written in [Go](https://golang.org/).
As a consequence, Hugo is not integrated into the npm module ecosystem - but instead delivered as a binary.

The **Hugo Installer** is here to help! It's a small node script which can be used to fetch a specific Hugo binary, for instance using the
`postinstall` hook within a `package.json` file.

> I've written this small tool because I'm developing my own personal website using Hugo, and I wanted to have a simple way of seeing the
> current Hugo version / simply upgrading Hugo to a newer version.

<br><br><br>

## How to install

You can get the **hugo-installer** via **npm** by adding it as a new *devDependency* to your `package.json` file and running
`npm install`. Alternatively, run the following command:

``` bash
npm install hugo-installer --save-dev
```

<br><br><br>

## How to use

We recommended to use the **hugo-installer** within the `postinstall` hook of a project's `package.json` file.

<br>

### Configure hugo version (required)

The Hugo version can be set using the `--version` CLI parameter. For example:

``` json
{
  "scripts": {
    "postinstall": "hugo-installer --version 0.46"
  }
}
```

As an alternative, the `--version` CLI parameter can also be an object path to some value defined in the `package.json` file. This
allows for the hugo version to be configured someplace else, e.g. in a `otherDependencies` object:

``` json
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

``` json
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

``` bash
bin/hugo/hugo.exe --config=hugo.config.json
```

Alternatively, one might also want to integrate Hugo in a NodeJS build script, or a NodeJS-based build tool such as
**[Gulp](https://gulpjs.com/)**. You can execute the Hugo binary using the `spawn` command; for example:

``` javascript
const path = require( 'path' );
const spawn = require( 'child_process' ).spawn;

// Use Hugo
spawn( path.resolve( process.cwd(), 'bin', 'hugo', 'hugo' ), [
  `--config=hugo.config.json`
], {
  stdio: 'inherit'
} )
  .on( 'close', () => {
    // Callback
  } );
```

<br><br><br>

## Creator

**Dominique Müller**

- E-Mail: **[dominique.m.mueller@gmail.com](mailto:dominique.m.mueller@gmail.com)**
- Website: **[www.devdom.io](https://www.devdom.io/)**
- Twitter: **[@itsdevdom](https://twitter.com/itsdevdom)**
