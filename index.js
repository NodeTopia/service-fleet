const Jerkie = require('jerkie');
const path = require('path');

var socketio = require('socket.io');


let service = new Jerkie({
    redis: process.env.REDIS_URI,
    name: 'fleet',
    schema: path.resolve(__dirname, './schema'),
    services: path.resolve(__dirname, './services'),
    methods: {
        connection: path.resolve(__dirname, './methods/connection.js'),
        use: path.resolve(__dirname, './methods/use.js'),
        utils: path.resolve(__dirname, './methods/utils'),
        socket: path.resolve(__dirname, './methods/socket'),
        container: path.resolve(__dirname, './methods/container'),
    },
    start: async function () {
        this.io = socketio(await this.config.get('io:port') || 9000);
        this.io.use(this.methods.use);
        this.io.on('connection', this.methods.connection);
    },
    stop: function () {

    }
});

service.start();