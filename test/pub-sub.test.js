const WebSocket = require('../index')

const port = 1337

describe('test pub-sub functions', () => {
    test('pub-sub publish to all subscribers (excluding publisher)', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://127.0.0.1:${wss.address().port}`)
            ws.on('message', (message) => {
                expect(message).toEqual('test-message')
                wss.close(done)
            })

            const ws2 = new WebSocket(`ws://127.0.0.1:${wss.address().port}`)
            ws2.on('message', (message) => {
                done(new Error('Publisher should not receive'))
            })
        })

        const topic = '/topic/test'

        wss.on('connection', (ws) => {
            // both subscribe
            ws.subscribe(topic)

            if (wss.clients.size === 2) {
                // second websocket going to be publisher
                ws.publish(topic, 'test-message')
            }
        })
    })

    test('pub-sub broadcast to all subscribers', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            let gotMsg = 0

            const ws = new WebSocket(`ws://127.0.0.1:${wss.address().port}`)
            ws.on('message', (message) => {
                gotMsg += 1
                expect(message).toEqual('test-message')
                if (gotMsg === 2) {
                    wss.close(done)
                }
            })

            const ws2 = new WebSocket(`ws://127.0.0.1:${wss.address().port}`)
            ws2.on('message', (message) => {
                gotMsg += 1
                expect(message).toEqual('test-message')
                if (gotMsg === 2) {
                    wss.close(done)
                }
            })
        })

        const topic = '/topic/test'

        wss.on('connection', (ws) => {
            ws.subscribe(topic)

            if (wss.clients.size === 2) {
                wss.publish(topic, 'test-message')
            }
        })
    })

    test('pub-sub mqtt topic', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            let gotMsg = 0

            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
            ws.on('message', (message) => {
                if (gotMsg === 0) {
                    expect(message).toEqual('room1-temperature')
                }

                if (gotMsg === 1) {
                    expect(message).toEqual('room2-temperature')
                }

                gotMsg += 1

                if (gotMsg === 2) {
                    wss.close(done)
                }
            })
        })

        const topic = '/topic/#'

        wss.on('connection', (ws) => {
            ws.subscribe(topic)

            wss.publish('/topic/room1', 'room1-temperature')
            wss.publish('/topic/room2', 'room2-temperature')
        })
    })

    test('pub-sub mqtt topic', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            let gotMsg = 0

            const ws = new WebSocket(`ws://127.0.0.1:${wss.address().port}`)
            ws.on('message', (message) => {
                if (gotMsg === 0) {
                    expect(message).toEqual('room1-temperature')
                }

                if (gotMsg === 1) {
                    expect(message).toEqual('room2-temperature')
                }

                gotMsg += 1

                if (gotMsg === 2) {
                    wss.close(done)
                }
            })
        })

        const topic = '/topic/#'

        wss.on('connection', (ws) => {
            ws.subscribe(topic)

            wss.publish('/topic/room1', 'room1-temperature')
            wss.publish('/topic/room2', 'room2-temperature')
        })
    })

    test('pub-sub unsubscribe from topic and unsubscribeAll topics', (done) => {
        let serverSocket

        const wss = new WebSocket.Server({
            port
        }, () => {
            let gotMsg = 0

            const ws = new WebSocket(`ws://127.0.0.1:${wss.address().port}`)
            ws.on('message', (message) => {
                if (gotMsg === 0) {
                    expect(message).toEqual('room1-temperature')
                }

                if (gotMsg === 1) {
                    expect(message).toEqual('room2-temperature')
                    serverSocket.unsubscribe('/topic/room1')

                    wss.publish('/topic/room1', 'dont-get-room1')
                    wss.publish('/topic/room2', 'get-room2')
                }

                if (gotMsg === 2) {
                    expect(message).toEqual('get-room2')
                    serverSocket.unsubscribeAll()

                    wss.publish('/topic/room1', 'dont-dont-room1')
                    wss.publish('/topic/room2', 'dont-dont-room2')

                    setTimeout(() => wss.close(done), 2000)
                }

                if (gotMsg > 2) {
                    done(new Error('Failed to unsubscribeAll'))
                }

                gotMsg += 1
            })
        })

        wss.on('connection', (ws) => {
            serverSocket = ws

            ws.subscribe('/topic/room1')
            ws.subscribe('/topic/room2')

            wss.publish('/topic/room1', 'room1-temperature')
            wss.publish('/topic/room2', 'room2-temperature')
        })
    })
})
