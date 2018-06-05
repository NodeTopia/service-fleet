'use strict';
const uuid = require('node-uuid');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'container.stop',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let io = ctx.io;
        let data = ctx.data;
        let schema = ctx.schema;
        let methods = ctx.methods;

        let {id} = data;

        let container,
            node;

        try {
            container = await schema.Container.findOne({
                _id: id
            });
            if (!container) {
                return reject(new Error('Container not found for ' + id));
            } else if (container.is_stopping) {
                return reject(new Error('Container is stopping or stopped ' + container.state));
            }
            node = await schema.Node.findOne({
                _id: container.node
            });
            if (!node) {
                let err = new Error('Node not found for "' + container.node + '" no need to stop');
                return reject(err);
            }
        } catch (err) {
            return reject(err)
        }


        var socket = io.sockets.connected[node.socketId];

        if (!socket) {
            container.state = 'ZOMBIE';
            container.statusCode = 128;
            container.stopped_at = Date.now();

            try {
                await container.save();
                methods.container.state(container);
                return reject(new Error('Container was on a node that is no longer active'));
            } catch (err) {
                return ctx.broadcast('fleet.error', err);
            }
        }

        container.is_stopping = true;

        try {
            await container.save();
        } catch (err) {
            return reject(err)
        }
        try {
            await methods.socket.stop(socket, container.id || container.uid);
        } catch (error) {
            container.state = 'CRASHED';
            container.statusCode = 127;
            container.stopped_at = Date.now();

            await container.save();

            methods.container.state(container);
            return reject(error);
        }

        container.state = 'STOPPED';
        container.statusCode = 0;
        container.stopped_at = Date.now();


        try {
            await container.save();
        } catch (err) {
            return reject(err);
        }
        resolve(container);

    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;