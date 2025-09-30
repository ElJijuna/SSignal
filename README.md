# ssignal

[![npm version](https://img.shields.io/npm/v/ssignal.svg)](https://www.npmjs.com/package/ssignal)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Signal pattern class.

## Instalación

```sh
npm install ssignal
```

## Uso básico

```js
import SSignal from 'ssignal';

const clientSubscriptor = (val) => console.log(val); // log CustomEvent with value 12, 13

const signal = new SSignal(10);
signal.subscribe(clientSubscriptor)

signal.value = 12;
signal.value = 23;
```

## ¿Qué es esto?

Una clase para usar el patron Signal.

## Scripts

- `npm run build`: Compila TypeScript a la carpeta `lib`.
- `npm test`: Ejecuta los tests.
- `npm run test:coverage`: Ejecuta los tests con cobertura.

## Licencia

MIT

---

Repositorio: https://github.com/ElJijuna/ssignal