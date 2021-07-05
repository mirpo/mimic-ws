const EventEmitter = require('events')

const ws = require('ws')

class WebSocket extends EventEmitter {
    constructor(id, uws, maxBackpressure) {
        super()

        this.id = id
        this._ws = uws
        this.readyState = ws.OPEN
        this._maxBackpressure = maxBackpressure

        this.on('close', () => {
            this.readyState = ws.CLOSED
        })
    }

    ping(data, mask = true, callback) {
        try {
            this._ws.ping(data)
        } catch (e) {
            this.emit('error', e.toString())
        }
    }

    // eslint-disable-next-line class-methods-use-this
    pong(data, mask = true, callback) {
        throw new Error('Not supported')
    }

    send(data, callback = undefined, isBinary = false) {
        let err
        try {
            const res = this._ws.send(data, isBinary)
            if (!res) {
                this.emit('backpressure', this.bufferedAmount)

                if (this._maxBackpressure && this.bufferedAmount > this._maxBackpressure) {
                    this.close(1011, 'reached maxBackpressure')
                }
            }
        } catch (e) {
            err = e.toString()
            this.emit('error', err)
        }

        if (typeof callback === 'function') {
            callback(err)
        }
    }

    publish(topic, message, isBinary = false) {
        this._ws.publish(topic, message, isBinary)
    }

    subscribe(topic) {
        this._ws.subscribe(topic)
    }

    unsubscribe(topic) {
        return this._ws.unsubscribe(topic)
    }

    unsubscribeAll() {
        this._ws.getTopics().forEach((topic) => {
            this._ws.unsubscribe(topic)
        })
    }

    close(code = 1000, reason = '') {
        try {
            this._ws.end(code, reason)
        } catch (e) {
            this.emit('error', e.toString())
        }
    }

    terminate() {
        try {
            this._ws.close()
        } catch (e) {
            //
        }
        this.emit('close')
    }

    get bufferedAmount() {
        let res
        try {
            res = this._ws.getBufferedAmount()
        } catch (e) {
            res = 0
        }
        return res
    }

    get remoteAddress() {
        const address = this._ws.getRemoteAddress()

        if (address.byteLength === 4) {
            return new Uint8Array(address).join('.')
        }

        return Array.from(new Uint16Array(address)).map((v) => v.toString(16)).join(':').replace(/((^|:)(0(:|$))+)/, '::')
    }
}

const readyStates = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED']
readyStates.forEach((readyState, i) => {
    WebSocket[readyState] = i
})

module.exports = WebSocket
