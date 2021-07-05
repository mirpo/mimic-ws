const EventEmitter = require('events')
const fs = require('fs')
const http = require('http')

const debug = require('debug')('mimic-ws')
const queryString = require('query-string')
const { uid } = require('uid/single')
const uWS = require('uWebSockets.js')

const WebSocket = require('./WebSocket')

const convertWsOptionsToUws = (options) => {
    const uwsOptions = {}

    uwsOptions.host = options.host
    uwsOptions.port = options.port
    uwsOptions.maxPayloadLength = options.maxPayload
    uwsOptions.maxBackpressure = options.maxBackpressure
    uwsOptions.idleTimeout = options.idleTimeout
    uwsOptions.compression = options.perMessageDeflate ? 1 : 0
    uwsOptions.sslCert = options.sslCert
    uwsOptions.sslKey = options.sslKey
    uwsOptions.path = options.path
    uwsOptions.verifyClient = options.verifyClient

    return uwsOptions
}

const extractInfoFromHttpRequest = (req) => {
    const info = {
        headers: [],
        url: undefined,
        query: undefined
    }

    req.forEach((header, value) => {
        info.headers[header] = value
    })

    info.query = req.getQuery()
    info.url = req.getUrl()

    return info
}

class WebSocketServer extends EventEmitter {
    constructor(options, callback) {
        super()

        this._listenSocket = undefined
        this.clients = new Map()

        const uwsDefaultOptions = {
            maxPayloadLength: 0,
            idleTimeout: 0,
            compression: 0,
            maxBackpressure: 0,
            sslCert: undefined,
            sslKey: undefined
        }

        this.originalOptions = {
            ...uwsDefaultOptions,
            maxPayload: undefined,
            perMessageDeflate: false,
            maxBackpressure: 0,
            family: 'IPv4',
            clientTracking: true, // always true
            verifyClient: undefined,
            host: '127.0.0.1',
            port: undefined,
            path: '/',
            ...options
        }

        this.options = convertWsOptionsToUws(this.originalOptions)

        if (!this.options.port || Number.parseInt(this.options.port, 10) <= 0) {
            throw new Error('Port must be defined')
        }

        if (Number.parseInt(this.options.maxPayloadLength, 10) < 0) {
            throw new Error('maxPayload/maxPayloadLength must be >= 0')
        }

        if (!this.options.path) {
            throw new Error('Path must be defined')
        }

        if (this.options.sslCert || this.options.sslKey) {
            if (!this.options.sslCert || !this.options.sslKey) {
                throw new Error('For SSL sslCert and sslKey must be defined')
            }

            if (!fs.existsSync(this.options.sslCert)) {
                throw new Error(`sslCert file ${this.options.sslCert} doesnt exists.`)
            }

            if (!fs.existsSync(this.options.sslKey)) {
                throw new Error(`sslKey file ${this.options.sslKey} doesnt exists.`)
            }

            this.options.ssl = true
        }

        this._startServer(callback)
    }

    close(callback) {
        debug('closing wss')

        this.clients.forEach((client) => client.close())

        if (this._listenSocket) {
            uWS.us_listen_socket_close(this._listenSocket)
            this._listenSocket = null
        }

        setTimeout(() => {
            if (typeof callback === 'function') {
                this.once('close', callback)
            }
            debug('closed wss')
            this.emit('close')
        }, 100)
    }

    _verifyClient(req) {
        if (this.options.verifyClient && typeof this.options.verifyClient === 'function') {
            return this.options.verifyClient(extractInfoFromHttpRequest(req))
        }

        return true
    }

    _startServer(callback) {
        this._app = !this.options.ssl ? new uWS.App() : new uWS.SSLApp({
            key_file_name: this.options.sslKey,
            cert_file_name: this.options.sslCert
        })
        debug(`created ${this.options.ssl ? 'SSL ' : ''}uWS`)

        this._app.ws(this.options.path, {
            maxPayloadLength: this.options.maxPayloadLength,
            idleTimeout: this.options.idleTimeout,
            compression: this.options.compression,
            maxBackpressure: this.options.maxBackpressure,
            open: (ws) => {
                debug('wss open event')

                const clientId = uid()
                const wsObj = new WebSocket(clientId, ws, this.options.maxBackpressure)

                ws.id = clientId
                ws.readyState = WebSocket.OPEN

                this.clients.set(clientId, wsObj)
                this.emit('connection', wsObj)
            },
            upgrade: (res, req, context) => {
                res.onAborted(() => {})

                if (!this._verifyClient(req)) {
                    res.writeStatus(`HTTP/1.1 401 ${http.STATUS_CODES[401]}`).end()
                    return
                }

                res.upgrade({
                    url: req.getUrl()
                },
                /* Spell these correctly */
                req.getHeader('sec-websocket-key'),
                req.getHeader('sec-websocket-protocol'),
                req.getHeader('sec-websocket-extensions'),
                context)
            },
            message: (ws, message, isBinary) => {
                debug('wss message event')

                const client = this.clients.get(ws.id)
                if (client) {
                    client.emit('message', !isBinary ? Buffer.from(message).toString() : message, isBinary)
                }
            },
            drain: (ws) => {
                debug('wss drain event')

                const client = this.clients.get(ws.id)
                if (client) {
                    client.emit('drain', client.bufferedAmount)
                    this.emit('drain', client)
                }
            },
            close: (ws, code, message) => {
                debug(`wss close event ${ws.id}`)
                ws.readyState = WebSocket.CLOSING

                const client = this.clients.get(ws.id)
                this.clients.delete(ws.id)
                if (client) {
                    client.emit('close', code, Buffer.from(message).toString())
                }

                ws.readyState = WebSocket.CLOSED
            },
            ping: (ws) => {
                debug('wss ping event')

                const client = this.clients.get(ws.id)
                if (client) {
                    this.emit('ping', client)
                    client.emit('ping')
                }
            },
            pong: (ws) => {
                debug('wss pong event')

                const client = this.clients.get(ws.id)
                if (client) {
                    this.emit('pong', client)
                    client.emit('pong')
                }
            }
        })

        this._app.listen(this.options.host, this.options.port, (listenSocket) => {
            if (listenSocket) {
                debug(`wss server is listing on: ${this.options.host}:${this.options.port}`)
                this._listenSocket = listenSocket

                if (typeof callback === 'function') {
                    this.on('listening', () => Promise.resolve().then(callback.bind(this)))
                }

                this.emit('listening')
            } else {
                const err = `Failed to start websocket server, host ${this.options.host}, port ${this.options.port}`
                debug(err)
                setImmediate(() => this.emit('error', err))
            }
        })
    }

    address() {
        return {
            address: this.options.host,
            family: this.options.family,
            port: this.options.port
        }
    }

    shouldHandle(req) {
        try {
            const serverPath = queryString.parseUrl(this.options.path).url
            const reqPath = queryString.parseUrl(req.url).url

            if (reqPath !== serverPath) {
                return false
            }
        } catch (e) {
            return false
        }

        return true
    }

    publish(topic, message) {
        this._app.publish(topic, message)
    }
}

module.exports = WebSocketServer
