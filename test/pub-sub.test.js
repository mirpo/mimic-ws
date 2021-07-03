const WebSocket = require('../index')

const port = 1337

describe('test pub-sub functions', () => {
    it('pub-sub', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            let gotMsg = 0

            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
            ws.on('message', (message) => {
                gotMsg += 1
                expect(message).toEqual('test-message')
                if (gotMsg === 2) {
                    wss.close(done)
                }
            })

            const ws2 = new WebSocket(`ws://localhost:${wss.address().port}`)
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
                ws.publish(topic, 'test-message')
            }
        })
    })

    it('pub-sub mqtt topic', (done) => {
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

            ws.publish('/topic/room1', 'room1-temperature')
            ws.publish('/topic/room2', 'room2-temperature')
        })
    })

    it('pub-sub mqtt topic', (done) => {
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

            ws.publish('/topic/room1', 'room1-temperature')
            ws.publish('/topic/room2', 'room2-temperature')
        })
    })

    it('pub-sub unsubscribe from topic and unsubscribeAll topics', (done) => {
        let serverSocket

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
                    serverSocket.unsubscribe('/topic/room1')

                    serverSocket.publish('/topic/room1', 'dont-get-room1')
                    serverSocket.publish('/topic/room2', 'get-room2')
                }

                if (gotMsg === 2) {
                    expect(message).toEqual('get-room2')
                    serverSocket.unsubscribeAll()

                    serverSocket.publish('/topic/room1', 'dont-dont-room1')
                    serverSocket.publish('/topic/room2', 'dont-dont-room2')

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

            ws.publish('/topic/room1', 'room1-temperature')
            ws.publish('/topic/room2', 'room2-temperature')
        })
    })
})
