const http = require('http')

const WebSocket = require('../index')

const port = 1337

describe('test WebSocket opened in WebSocket.Server', () => {
    it('takes into account the data in the socket queue', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
        })

        wss.on('connection', (ws) => {
            const data = Buffer.alloc(1024, 61)

            while (ws.bufferedAmount === 0) {
                ws.send(data)
            }

            expect(ws.bufferedAmount).toBeGreaterThan(0)

            ws.on('close', () => wss.close(done))
            ws.close()
        })
    })

    it("emits an 'upgrade' event", (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
            ws.on('upgrade', (res) => {
                expect(res instanceof http.IncomingMessage).toBeTruthy()
                expect(res.headers).toHaveProperty('uwebsockets')
                wss.close(done)
            })
        })
    })

    it("emits a 'ping' event", (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
            ws.on('open', () => {
                ws.ping()
            })

            ws.on('ping', () => {
                wss.close(done)
            })
        })

        wss.on('ping', (ws) => {
            ws.ping()
        })
    })

    it("emits a 'pong' event", (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
            ws.on('open', () => {
                ws.pong()
            })
        })

        wss.on('pong', (ws) => {
            wss.close(done)
        })
    })

    it('connects when pathname is not null', (done) => {
        const wss = new WebSocket.Server({
            port,
            path: '/foobar',
            verifyClient: (info) => {
                expect(info).toHaveProperty('headers')
                expect(info.headers.foo).toEqual('bar')
                expect(info.headers.pam).toEqual('bam')
                expect(info.headers.host).toEqual(`localhost:${port}`)
                expect(info.query).toEqual('token=qwerty')
                expect(info.url).toEqual('/foobar/')
                wss.close(done)
            }
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}/foobar/?token=qwerty`, {
                headers: {
                    foo: 'bar',
                    pam: 'bam'
                }
            })
        })
    })

    it('emit backpressure and drain events', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
        })

        wss.on('connection', (ws) => {
            const data = Buffer.alloc(10000, 61)

            let stop = false
            ws.on('backpressure', (backpressure) => {
                expect(backpressure).toBeGreaterThan(0)
                stop = true
            })
            while (true) {
                if (stop) {
                    break
                }
                ws.send(data)
            }

            ws.on('drain', () => {
                expect(ws.bufferedAmount).toEqual(0)
                wss.close(done)
            })
        })
    })

    it('close slow websocket if reached maxBackpressure', (done) => {
        const wss = new WebSocket.Server({
            port,
            maxBackpressure: 1000000
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
        })

        wss.on('connection', (ws) => {
            const data = Buffer.alloc(5000000, 61)

            let stop = false
            ws.on('close', (backpressure) => {
                stop = true
                expect(backpressure).toBeGreaterThan(0)
                wss.close(done)
            })
            while (true) {
                if (stop) {
                    break
                }
                ws.send(data)
            }
        })
    })

    it('can send a big binary message', (done) => {
        const wss = new WebSocket.Server({
            port,
            maxPayload: 5 * 1024 * 1024
        }, () => {
            const array = new Float32Array(1024 * 1024)

            for (let i = 0; i < array.length; i++) {
                array[i] = i / 5
            }

            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
            ws.binaryType = 'arraybuffer'

            ws.on('open', () => {
                ws.send(array)
            })
            ws.on('message', (msg) => {
                const gotArray = new Float32Array(msg)
                expect(gotArray).toEqual(array)
                wss.close(done)
            })
        })

        wss.on('connection', (ws) => {
            ws.on('message', (msg, isBinary) => {
                const gotArray = new Float32Array(msg)
                ws.send(gotArray, undefined, isBinary)
            })
        })
    })

    it('can send text data', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
            const msg = 'Bam-pam'

            ws.on('open', () => ws.send(msg))
            ws.on('message', (message) => {
                expect(message).toEqual(msg)
                wss.close(done)
            })
        })

        wss.on('connection', (ws) => {
            ws.on('message', (msg) => ws.send(msg))
        })
    })

    it('sends numbers as strings', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('open', () => ws.send(0))
        })

        wss.on('connection', (ws) => {
            ws.on('message', (message) => {
                expect(message).toEqual('0')
                wss.close(done)
            })
        })
    })

    it('calls the callback when data is written out', (done) => {
        const msg = 'hello'

        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
        })

        wss.on('connection', (ws) => {
            ws.send(msg, (err) => {
                expect(err).toEqual(undefined)
                wss.close(done)
            })
        })
    })

    it('possible to send empty message', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('message', (message) => {
                expect(message).toEqual('')
                wss.close(done)
            })
        })

        wss.on('connection', (ws) => {
            ws.send()
        })
    })

    it('works when close reason is not specified', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('open', () => ws.close(1000))
        })

        wss.on('connection', (ws) => {
            ws.on('close', (code, message) => {
                expect(message).toEqual('')
                expect(code).toEqual(1000)
                wss.close(done)
            })
        })
    })

    it('works when close reason is specified', (done) => {
        const reason = 'bam-reason'

        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('open', () => ws.close(1000, reason))
        })

        wss.on('connection', (ws) => {
            ws.on('close', (code, message) => {
                expect(message).toEqual(reason)
                expect(code).toEqual(1000)
                wss.close(done)
            })
        })
    })

    it('allows close code 1013', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('close', (code) => {
                expect(code).toEqual(1013)
                wss.close(done)
            })
        })

        wss.on('connection', (ws) => ws.close(1013))
    })

    it('allows close code 1014', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('close', (code) => {
                expect(code).toEqual(1014)
                wss.close(done)
            })
        })

        wss.on('connection', (ws) => ws.close(1014))
    })

    it('cannot connect to secure websocket server via ws://', (done) => {
        const wss = new WebSocket.Server({
            port,
            sslCert: './test/fixtures/cert.pem',
            sslKey: './test/fixtures/key.pem'
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`, {
                rejectUnauthorized: false
            })

            ws.on('error', () => {
                wss.close(done)
            })
        })
    })

    it('can send and receive text data through SSL', (done) => {
        const wss = new WebSocket.Server({
            port,
            sslCert: './test/fixtures/cert.pem',
            sslKey: './test/fixtures/key.pem'
        }, () => {
            const ws = new WebSocket(`wss://localhost:${wss.address().port}`, {
                rejectUnauthorized: false
            })

            ws.on('open', () => {
                ws.send('foobar')
            })
        })

        wss.on('connection', (ws) => {
            ws.on('message', (message) => {
                expect(message).toEqual('foobar')
                wss.close(done)
            })
        })
    })

    it('can send and receive binary data through SSL', (done) => {
        const wss = new WebSocket.Server({
            port,
            maxPayload: 5 * 1024 * 1024,
            sslCert: './test/fixtures/cert.pem',
            sslKey: './test/fixtures/key.pem'
        }, () => {
            const array = new Float32Array(1024 * 1024)

            for (let i = 0; i < array.length; i++) {
                array[i] = i / 5
            }

            const ws = new WebSocket(`wss://localhost:${wss.address().port}`, {
                rejectUnauthorized: false
            })
            ws.binaryType = 'arraybuffer'

            ws.on('open', () => {
                ws.send(array)
            })
            ws.on('message', (msg) => {
                const gotArray = new Float32Array(msg)
                expect(gotArray).toEqual(array)
                wss.close(done)
            })
        })

        wss.on('connection', (ws) => {
            ws.on('message', (msg, isBinary) => {
                const gotArray = new Float32Array(msg)
                ws.send(gotArray, undefined, isBinary)
            })
        })
    })

    it('can terminate socket from server', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('error', () => {
                wss.close(done)
            })
        })

        wss.on('connection', (ws) => {
            ws.terminate()
        })
    })

    it('can get remoteAddress from websocket', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
        })

        wss.on('connection', (ws) => {
            expect(ws.remoteAddress).toEqual('127.0.0.1')
            wss.close(done)
        })
    })
})
