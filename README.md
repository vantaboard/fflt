
---

# fflt

[![npm package][npm-img]][npm-url]
[![Build Status][build-img]][build-url]
[![Downloads][downloads-img]][downloads-url]
[![Issues][issues-img]][issues-url]
[![Code Coverage][codecov-img]][codecov-url]
[![Semantic Release][semantic-release-img]][semantic-release-url]
[![Template Used][ryansonshine-img]][ryansonshine-url]

> Format, fix, lint, and typecheck.

More features on the way! This is a tool to format, fix, lint, and typecheck only the files that you have touched when diff'd against another branch.

## Install

```sh
npm install -D fflt
```

```sh
yarn add -D fflt
```

## Usage

```sh
Usage
  - Create a config file
    fflt init

  - Runs a command using fflt
    fflt command <command>

Options
  --version, -v  Show version
  --cached,  -c  Include cached files
  --default, -d  Use default branch
  --branch,  -b  Name of branch to use
  --root,    -r  Use git root
  --ignore,  -i  Ignore pattern (regex)
  --verbose, -v  Verbose output
```

[build-img]:https://github.com/vantaboard/fflt/actions/workflows/release.yml/badge.svg
[build-url]:https://github.com/vantaboard/fflt/actions/workflows/release.yml
[downloads-img]:https://img.shields.io/npm/dt/fflt
[downloads-url]:https://www.npmtrends.com/fflt
[npm-img]:https://img.shields.io/npm/v/fflt
[npm-url]:https://www.npmjs.com/package/fflt
[issues-img]:https://img.shields.io/github/issues/vantaboard/fflt
[issues-url]:https://github.com/vantaboard/fflt/issues
[codecov-img]:https://codecov.io/gh/vantaboard/fflt/branch/main/graph/badge.svg
[codecov-url]:https://codecov.io/gh/vantaboard/fflt
[semantic-release-img]:https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg
[semantic-release-url]:https://github.com/semantic-release/semantic-release
[ryansonshine-img]:https://img.shields.io/badge/%F0%9F%A7%91-Template%20Used-blue
[ryansonshine-url]:https://github.com/ryansonshine/typescript-npm-package-template
