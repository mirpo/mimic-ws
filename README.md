# mimic-ws

[![Npm version][npm-image]][npm-url] [![Build Status][ci-image]][ci-url] [![Coverage Status][coveralls-image]][coveralls-url]

Mimic-ws is drop-in replacement for [ws](https://github.com/websockets/ws), powered by [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js)

**Note**: This module does not work in the browser. 

## Installing
`npm install mimic-ws`

#### Been a drop-in replacement, `mimic-ws` has some limits and difference:
- For SSL initialization you don't need separate HTTP server, just define `certificate` and `key` parameters, check [examples](#usage-examples).
- `clientTracking` is always true, and `wss.clients` is a `Map`, key is unique id, each `ws` has the same unique attribute `id`. No need to code own logic.
- Added `backpressure` event, so you can check that websocket is slow.
- Added `drain` event, so you can check that websocket buffer is free.
- Added `publish`/`subscribe` functions with MQTT topics support, check [examples](#usage-examples)
- `WebSocket` handlers like `onclose`/`onerror` are removed. Use events.
- Use `idleTimeout` for dropping connections.
- Use `maxBackpressure` for dropping slow consumers.
- `verifyClient` parameters are bit different.

## Usage examples

### Simple server

```js
const WebSocket = require('mimic-ws')

const wss = new WebSocket.Server({
    port: 8080
})

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('received: %s', message)
    })

    ws.send('something')
})
```

### SSL server

```js
const WebSocket = require('mimic-ws')

const wss = new WebSocket.Server({
    port: 8080,
    sslCert: './test/fixtures/cert.pem',
    sslKey: './test/fixtures/key.pem',
})

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('received: %s', message)
    })

    ws.send('something')
})
```

### Server broadcast old school

A client WebSocket broadcasting to all connected WebSocket clients, including itself.

```js
const WebSocket = require('mimic-ws')

const wss = new WebSocket.Server({
    port: 8080
})

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        wss.clients.forEach((client) => {
            client.send(data)
        })
    })
})
```
A client WebSocket broadcasting to every other connected WebSocket clients, excluding itself.

```js
const WebSocket = require('mimic-ws')

const wss = new WebSocket.Server({
    port: 8080
})

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        wss.clients.forEach((client, id) => {
            if (ws !== client) { // or if (id.localeCompare(ws.id))
                client.send(data)
            }
        })
    })
})
```

### Server broadcast pub/sub using MQTT topics


```js
const WebSocket = require('mimic-ws')

const wss = new WebSocket.Server({
    port: 8080
})

wss.on('connection', (ws) => {
    ws.subscribe('/house/#')

    ws.publish('/house/room1')
    ws.publish('/house/room2')
})
```

### Simple app using pub/sub JSON protocol
```js
const WebSocket = require('mimic-ws')

const wss = new WebSocket.Server({
    port: 8080
})

const handle = (ws, msg) => {
    if (msg && msg.action) {
        switch (msg.action) {
            case 'publish':
                ws.publish(msg.topic, JSON.stringify(msg.data))
                break

            case 'subscribe':
                console.log(msg)
                ws.subscribe(msg.topic)
                break

            case 'unsubscribe':
                ws.unsubscribe(msg.topic)
                break

            default:
                console.error(`Unknown action: ${msg.action}`)
        }
    }
}

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const msg = JSON.parse(message)
        handle(ws, msg)
    })
})

const publisher = new WebSocket(`ws://localhost:${wss.address().port}`)
publisher.on('open', () => {
    setInterval(() => {
        const msg = {
            action: 'publish',
            topic: '/house/room1',
            data: {
                title: 'temperature in room1',
                value: Math.floor(Math.random() * 30),
                timestamp: Date.now()
            }
        }
        publisher.send(JSON.stringify(msg))

        const msg2 = {
            action: 'publish',
            topic: '/house/room2',
            data: {
                title: 'temperature in room2',
                value: Math.floor(Math.random() * 30),
                timestamp: Date.now()
            }
        }
        publisher.send(JSON.stringify(msg2))
    }, 1000)
})

const subscriber = new WebSocket(`ws://localhost:${wss.address().port}`)
subscriber.on('open', () => {
    const msg = {
        action: 'subscribe',
        topic: '/house/#'
    }
    subscriber.send(JSON.stringify(msg))
})

subscriber.on('message', (message) => {
    console.log(`got message: ${message}`)
})
```


#### Other examples
Check test cases.

#### Changelog
We're using the GitHub releases for changelog entries.

#### TODO
1. More tests
2. Typescript declaration
3. Benchmarks

### Enable debug
``export DEBUG=mimic-ws*``

#### License
[MIT](LICENSE)

[npm-image]: https://img.shields.io/npm/v/mimic-ws.svg?logo=npm
[npm-url]: https://www.npmjs.com/package/mimic-ws

[ci-image]: https://github.com/mirpo/mimic-ws/workflows/Build/badge.svg
[ci-url]: https://github.com/mirpo/mimic-ws/actions

[coveralls-image]: https://coveralls.io/repos/github/mirpo/mimic-ws/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/mirpo/mimic-ws
