module.exports = function (socket) {
    let ctx = this;
    let schema = ctx.schema;
    let methods = ctx.methods;
    socket.on('disconnect', function () {
        schema.Node.findOne({
            socketId: socket.id
        }, function (err, node) {
            if (err)
                return ctx.broadcast('fleet.error', err);

            if (!node) {
                return ctx.broadcast('fleet.error', new Error('Node not found for exit'));
            }
            node.is_active = false;
            node.save(function () {
                ctx.broadcast('fleet.node.disconnect', node);
            });
        });
    });
    socket.once('init', function (data) {

        schema.Node.findOne({
            socketId: socket.id
        }, function (err, node) {
            if (err)
                return ctx.broadcast('fleet.error', err);

            if (!node) {
                return ctx.broadcast('fleet.error', new Error('Node not found for init'));
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
                ctx.broadcast('fleet.node.init.' + node.id, node);
            });
        });
    });
    socket.once('exit', function (data) {
        schema.Node.findOne({
            socketId: socket.id
        }, function (err, node) {
            if (err)
                return ctx.broadcast('fleet.error', err);

            if (!node) {
                return ctx.broadcast('fleet.error', new Error('Node not found for exit'));
            }
            node.is_active = false;
            node.save(function () {
                ctx.broadcast('fleet.node.exit', node);
            });
        });
    });
    socket.on('state', function (state, info) {
        schema.Container.findOne({
            uid: info.uid
        }, function (err, container) {
            if (err)
                return ctx.broadcast('fleet.error', err);

            if (!container) {
                return ctx.broadcast('fleet.error', new Error('container not found for ' + info.uid));
            }

            if (container.shortLived && state === 'CRASHED') {
                state = 'ENDED'
            }


            container.state = state;

            let update = {
                state: state
            };

            if (state === 'EVICTED') {
                container.evicted = update.evicted = true;
                container.evicted_at = update.evicted_at = Date.now();
            }

            schema.Container.update({
                uid: info.uid
            }, update, function (err) {
                if (err)
                    return ctx.broadcast('fleet.error', err);

                methods.container.state(container);
            });

        });
    });
    socket.on('wait', function (info, statusCode) {
        schema.Container.findOne({
            uid: info.uid
        }, function (err, container) {
            if (err)
                return ctx.broadcast('fleet.error', err);

            if (!container) {
                return ctx.broadcast('fleet.error', new Error('container not found for ' + info.uid));
            }

            schema.Container.update({
                uid: info.uid
            }, {
                statusCode: statusCode,
                $set: {
                    stopped_at: new Date()
                }
            }, async function (err) {
                if (err)
                    return ctx.broadcast('fleet.error', err);

                try {
                    container = await schema.Container.findOne({
                        uid: info.uid
                    });
                } catch (e) {
                    return;//ignore
                }

                if(container.type==='build'){
                    ctx.broadcast(`fleet.build.${info.uid}`, container);
                }

                if (container.ports.length > 0) {
                    try {
                        for (let item of container.ports) {
                            ctx.call('router.remove.host', {
                                reference: container.reference,
                                name: container.config.channel,
                                host: item.ip,
                                port: item.port
                            });
                        }
                    } catch (err) {
                        //
                    }
                }
            });

        });
    });

    socket.on('stats', function (id, stats) {
        ctx.broadcast('fleet.container.stats.' + id, id, stats);
    });
    socket.on('heartbeat', async function (data) {
        try {
            await schema.Node.update({socketId: socket.id}, {
                $set: {
                    memory: {
                        used: data.memory.used,
                        avalibale: data.memory.avalibale
                    },
                    cores: {
                        used: data.cores.used,
                        avalibale: data.cores.avalibale,
                        count: data.cores.count,
                        loadavg: data.cores.loadavg
                    }
                }
            })

            //console.log(socket.id, data.containers.count, data.memory.avalibale.toFixed(2), data.cores.avalibale, data.cores.loadavg[1])

        } catch (e) {
            console.log(e)
        }
    });
}