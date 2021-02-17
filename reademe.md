# Uptime monitor using NodeJS

This is project for monitor my server network that available or not. This can be use inbound and outbound.

## Features
- [/] Ping to specific address
- [/] Store uptime history with duration
- [/] Uptime history via webpage

## Todos
- [ ] Support cluster
- [ ] Support database
- [ ] Add graph to the webpage
- And more...

## ⚒ Install
```
// By yarn
yarn
// By npm
npm install
// or
npm i
```

## ⚙️ Usage
```
// By yarn
yarn start
// By npm
npm start
```

You can access on the website by `http://{your ip}:22222` (Default port)


### ⚠️ Caution
- This program use json file as database. You can't use it in cluster environment.
- This program will load json file and store in memory. This can cause memory leak in long term.