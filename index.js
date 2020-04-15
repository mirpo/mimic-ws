const WebSocket = require('ws')

// unassign stuff from ws
delete WebSocket.Receiver
delete WebSocket.Sender
delete WebSocket.createWebSocketStream

// replace ws Server, with mimic-ws Server
WebSocket.Server = require('./lib/WebSocketServer')

module.exports = WebSocket
