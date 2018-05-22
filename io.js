var socketio = require('socket.io');

var nconf = require('nconf');
var kue = require('nodetopia-kue');
var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));

var io = socketio(nconf.get('fleet:io:port'));

module.exports = io;

io.use(function (socket, next) {

    var handshakeData = socket.request;
    var id = handshakeData._query.id;
    var token = handshakeData._query.token;

    if (token == nconf.get('fleet:io:token')) {
        mongoose.Node.findOne({
            id: id
        }, function (err, node) {
            if (err) {
                kue.events.emit('fleet.error', err);
                return next(err);
            }

            if (!node) {
                node = new mongoose.Node({
                    id: id
                });
            }
            node.socketId = socket.id;
            node.save(next);
        });
    } else {
        var err = new Error('auth failed');
        kue.events.emit('fleet.error', err);
        next(err);
    }
});

io.on('connection', function (socket) {


    function updateResources() {
        //return;
        socket.emit('resources', async function (err, data) {
            try {
                let node = await mongoose.Node.findOne({
                    socketId: socket.id
                })
                //node.memory.total = Math.ceil((data.totalmem / Math.pow(1024, 2)) / 256) * 256;
                node.memory.used = data.memory.used;
                node.memory.avalibale = data.memory.avalibale;
                node.cores.used = data.cores.used;
                node.cores.count = data.cores.count;
                node.cores.avalibale = data.cores.avalibale;
                node.cores.loadavg = data.cores.loadavg;
                console.log(node.id, data.containers.count, node.memory.avalibale.toFixed(2), node.cores.avalibale)
                await node.save();
            } catch (e) {
                console.log(e)
            }

        })
    }

    let resourceTimmer = setInterval(updateResources, 10000)

    socket.on('disconnect', function () {
        mongoose.Node.findOne({
            socketId: socket.id
        }, function (err, node) {
            if (err)
                return kue.events.emit('fleet.error', err);

            if (!node) {
                return kue.events.emit('fleet.error', new Error('Node not found for exit'));
            }
            node.is_active = false;
            node.save(function () {
                kue.events.emit('fleet.node.disconnect', node);
            });
        });
    });
    socket.once('init', function (data) {

        mongoose.Node.findOne({
            socketId: socket.id
        }, function (err, node) {
            if (err)
                return kue.events.emit('fleet.error', err);

            if (!node) {
                return kue.events.emit('fleet.error', new Error('Node not found for init'));
            }

            node.is_active = true;
            node.address = data.address;
            node.environment = data.environment;
            node.zone = data.zone;
            node.name = data.name;
            node.id = data.id;
            node.multitenant = data.multiTenant;

            if (!node.reserved) {
                node.memory.total = Math.ceil((data.totalmem / Math.pow(1024, 2)) / 256) * 256;
                node.memory.used = data.memory.used;
                node.memory.avalibale = data.memory.avalibale;
                node.cores.used = data.cores.used;
                node.cores.count = data.cores.count;
                node.cores.avalibale = data.cores.avalibale;
                node.cores.loadavg = data.cores.loadavg;
            } else {
                node.reserved = false;
            }
            node.save(function (err) {
                kue.events.emit('fleet.node.init.' + node.id, node);
            });
        });
    });
    socket.once('exit', function (data) {
        clearImmediate(resourceTimmer)
        mongoose.Node.findOne({
            socketId: socket.id
        }, function (err, node) {
            if (err)
                return kue.events.emit('fleet.error', err);

            if (!node) {
                return kue.events.emit('fleet.error', new Error('Node not found for exit'));
            }
            node.is_active = false;
            node.save(function () {
                kue.events.emit('fleet.node.exit', node);
            });
        });
    });
    socket.on('state', function (state, info) {
        mongoose.Container.findOne({
            uid: info.uid
        }, function (err, container) {
            if (err)
                return kue.events.emit('fleet.error', err);

            if (!container) {
                return kue.events.emit('fleet.error', new Error('container not found for ' + info.uid));
            }

            container.state = state;

            mongoose.Container.update({
                uid: info.uid
            }, {
                state: state
            }, function (err) {
                if (err)
                    return kue.events.emit('fleet.error', err);
                console.log(state)
                kue.events.emit('fleet.state.' + state.toLocaleLowerCase(), container);

            });

        });
    });
    socket.on('wait', function (info, statusCode) {
        mongoose.Container.findOne({
            uid: info.uid
        }, function (err, container) {
            if (err)
                return kue.events.emit('fleet.error', err);

            if (!container) {
                return kue.events.emit('fleet.error', new Error('container not found for ' + info.uid));
            }

            mongoose.Container.update({
                uid: info.uid
            }, {
                statusCode: statusCode,
                $set: {
                    stopped_at: new Date()
                }
            }, async function (err) {
                if (err)
                    return kue.events.emit('fleet.error', err);

                try {
                    container = await mongoose.Container.findOne({
                        uid: info.uid
                    });
                } catch (e) {
                    //ignore
                }


                if (container.ports.length > 0) {
                    kue.events.emit('fleet.ports.remove', container);
                }
            });

        });
    });

});
