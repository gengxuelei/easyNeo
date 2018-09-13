easyNeo
===============

[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Coveralls][coveralls-image]][coveralls-url]
[![node version][node-image]][node-url]

[npm-image]: https://img.shields.io/npm/v/easyneo.svg?style=flat-square
[npm-url]: https://npmjs.org/package/easyneo
[travis-image]: https://img.shields.io/travis/easyneo.svg?style=flat-square
[travis-url]: https://travis-ci.org/easyneo
[coveralls-image]: https://img.shields.io/coveralls/easyneo.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/easyneo?branch=master
[node-image]: https://img.shields.io/badge/node.js-%3E=_7.6-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/


快捷调用`neo`合约方法的easy封装

## Install

[![NPM](https://nodei.co/npm/easyneo.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/easyneo/)

## Usage

```js
var easyNeo = require('easyneo');

var wif = "wif";
var assertId = "assertId";
var toAddr = "toAddr";
var amount = 100000000;

var r = easyNeo.transferNep5(wif, assertId, toAddr, amount);
console.log(r);

```