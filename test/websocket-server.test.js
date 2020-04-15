const WebSocket = require('../index')

const port = 1337

describe('test WebSocket.Server', () => {
    it('throws an error if no option object is passed', () => {
        expect(() => new WebSocket.Server()).toThrowError()
    })

    it('throws an error if port 0', () => {
        const options = {
            port: 0
        }

        expect(() => new WebSocket.Server(options)).toThrowError()
    })

    it('exposes options passed to constructor', (done) => {
        const options = {
            port
        }

        const wss = new WebSocket.Server(options, () => {
            expect(wss.options.port).toEqual(port)
            wss.close(done)
        })
    })

    it('check error handling', (done) => {
        const options = {
            host: 'BAM_HOST',
            port
        }

        const wss = new WebSocket.Server(options, () => {
            wss.close(done(new Error('Should be called')))
        })

        wss.on('error', (err) => {
            expect(err).toBe('Failed to start websocket server, host BAM_HOST, port 1337')
            wss.close(done)
        })
    })

    // TODO enable later
    // it('emits an error if http server bind fails', (done) => {
    //     const wss1 = new WebSocket.Server({
    //         port
    //     }, () => {
    //         const wss2 = new WebSocket.Server({
    //             port
    //         })
    //
    //         wss2.on('error', () => {
    //             wss2.close()
    //             wss1.close(done)
    //         })
    //     })
    // })

    it('starts a server on a given port', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${port}`)
        })

        wss.on('connection', () => wss.close(done))
    })

    it('binds the server on any IPv6 address when available', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            expect(wss.address().address).toEqual('0.0.0.0')
            wss.close(done)
        })
    })

    it('does not throw when called twice', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            wss.close()
            wss.close()
            wss.close()

            done()
        })
    })

    it('closes all clients', (done) => {
        let closes = 0
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
            ws.on('close', () => {
                closes += 1
                if (closes === 2) {
                    done()
                }
            })
        })

        wss.on('connection', (ws) => {
            ws.on('close', () => {
                closes += 1
                if (closes === 2) {
                    done()
                }
            })
            wss.close()
        })
    })

    it('emits the "close" event', (done) => {
        const wss = new WebSocket.Server({
            port
        })

        wss.on('close', done)
        wss.close()
    })

    it('returns a list of connected clients', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            expect(wss.clients.size).toBe(0)
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
        })

        wss.on('connection', () => {
            expect(wss.clients.size).toBe(1)
            wss.close(done)
        })
    })

    it('is updated when client terminates the connection', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('open', () => ws.terminate())
        })

        wss.on('connection', (ws) => {
            ws.on('close', () => {
                expect(wss.clients.size).toBe(0)
                wss.close(done)
            })
        })
    })

    it('is updated when client closes the connection', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('open', () => ws.close())
        })

        wss.on('connection', (ws) => {
            ws.on('close', () => {
                expect(wss.clients.size).toBe(0)
                wss.close(done)
            })
        })
    })

    it('returns true when the path matches', () => {
        const wss = new WebSocket.Server({
            port,
            path: '/foo'
        })

        expect(wss.shouldHandle({
            url: '/foo'
        })).toBe(true)

        wss.close()
    })

    it("returns false when the path doesn't match", () => {
        const wss = new WebSocket.Server({
            port,
            path: '/foo'
        })

        expect(wss.shouldHandle({
            url: '/bar'
        })).toBe(false)

        expect(wss.shouldHandle({
            url: 123
        })).toBe(false)

        wss.close()
    })

    it("closes the connection when path doesn't match", (done) => {
        const wss = new WebSocket.Server({
            port,
            path: '/foo'
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}/bar`)

            ws.on('error', (err) => {
                expect(err.toString()).toBe('Error: socket hang up')
                wss.close()
                done()
            })
        })
    })

    // TODO recheck verifyClient logic
    it('can reject client synchronously', (done) => {
        const wss = new WebSocket.Server(
            {
                verifyClient: () => false,
                port,
            },
            () => {
                const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

                ws.on('close', (code, message) => {
                    expect(code).toBe(1000)
                    expect(message).toBe('')
                    wss.close()
                    done()
                })
            }
        )

        wss.on('connection', () => {
            done(new Error("Unexpected 'connection' event"))
        })
    })

    it('start SSL server', (done) => {
        const wss = new WebSocket.Server({
            port,
            sslCert: './test/fixtures/cert.pem',
            sslKey: './test/fixtures/key.pem'
        }, () => {
            const ws = new WebSocket(`wss://localhost:${wss.address().port}`, {
                rejectUnauthorized: false
            })

            ws.on('open', () => ws.close())
        })

        wss.on('connection', (ws) => {
            ws.on('close', () => {
                expect(wss.clients.size).toBe(0)
                wss.close(done)
            })
        })
    })

    it('check readyStates', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('open', () => {
                expect(ws.readyState).toBe(WebSocket.OPEN)
                ws.close()
            })
        })

        wss.on('connection', (ws) => {
            expect(ws.readyState).toBe(WebSocket.OPEN)

            ws.on('close', () => {
                expect(ws.readyState).toBe(WebSocket.CLOSED)
                wss.close(done)
            })
        })
    })

    it('can send a ping with no data', (done) => {
        const wss = new WebSocket.Server({
            port
        }, () => {
            const ws = new WebSocket(`ws://localhost:${wss.address().port}`)

            ws.on('open', () => {
                ws.ping(() => ws.ping())
            })
        })

        wss.on('connection', (ws) => {
            let pings = 0
            ws.on('ping', (data) => {
                expect(data).toBe(undefined)
                pings += 1
                if (pings === 2) {
                    wss.close(done)
                }
            })
        })
    })

    it('throw if sslCert not found', () => {
        const sslCert = './test/fixtures/cert_WRONG.pem'
        expect(() => new WebSocket.Server({
            port,
            sslCert,
            sslKey: './test/fixtures/key.pem'
        })).toThrow(new Error(`sslCert file ${sslCert} doesnt exists.`))
    })

    it('throw if sslKey not found', () => {
        const sslKey = './test/fixtures/key_WRONG.pem'
        expect(() => new WebSocket.Server({
            port,
            sslCert: './test/fixtures/cert.pem',
            sslKey
        })).toThrow(new Error(`sslKey file ${sslKey} doesnt exists.`))
    })

    it('throw if only sslCert or sslKey is defined', () => {
        expect(() => new WebSocket.Server({
            port,
            sslCert: './test/fixtures/cert.pem'
        })).toThrow(new Error('For SSL sslCert and sslKey must be defined'))

        expect(() => new WebSocket.Server({
            port,
            sslKey: './test/fixtures/key.pem'
        })).toThrow(new Error('For SSL sslCert and sslKey must be defined'))
    })

    it('throw if path is not defined', () => {
        expect(() => new WebSocket.Server({
            port,
            path: undefined
        })).toThrow(new Error('Path must be defined'))
    })

    it('throw if maxPayloadLength is less than zeros', () => {
        expect(() => new WebSocket.Server({
            port,
            maxPayload: -1
        })).toThrow(new Error('maxPayload/maxPayloadLength must be >= 0'))
    })

    // TODO recheck later
    // it('drops websocket on message larger than maxPayload', (done) => {
    //     const wss = new WebSocket.Server({
    //         port,
    //         maxPayload: 10000
    //     }, () => {
    //         const ws = new WebSocket(`ws://localhost:${wss.address().port}`)
    //         ws.on('open', () => {
    //             const data = Buffer.alloc(10001, 61)
    //             ws.send(data)
    //         })
    //
    //         ws.on('close', (code, reason) => {
    //             expect(code).toEqual(1006)
    //             wss.close(done)
    //         })
    //     })
    // })
})
