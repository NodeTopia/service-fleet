'use strict';
const uuid = require('node-uuid');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'container.start',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let io = ctx.io;
        let data = ctx.data;
        let schema = ctx.schema;
        let methods = ctx.methods;

        let node,
            size;


        if (data.node) {
            node = data.node;
            size = data.container.size;
        } else {
            let result;

            try {
                result = await ctx.call('fleet.allocate.resources', {
                    size: data.container.size,
                    zones: data.container.zones,
                    exclude: data.exclude || []
                });
            } catch (err) {
                return reject(err);
            }

            node = result.node;
            size = result.size;
        }

        let socket = io.sockets.connected[node.socketId];

        if (!socket) {
            let err = new Error('The node that the container was going to run on is not loger active');
            return reject(err);
        }


        if (data.container.restartable === undefined) {
            data.container.restartable = true;
        }

        data.container.uid = data.container.uid || uuid.v4();
        data.container.size = size;
        data.container.logs = data.container.logs || await ctx.config.get('logs');

        let container = new schema.Container({
            reference: data.reference,
            node: node._id,
            uid: data.container.uid,
            restartable: data.container.restartable,
            shortLived: !!data.container.shortLived,
            is_restart: data.container.is_restart,
            type: data.type,
            state: 'INITIALIZING',
            config: data.container
        });

        try {
            await container.save();
        } catch (err) {
            return reject(err);
        }

        methods.container.state(container);

        let con;
        try {
            con = await methods.socket.start(socket, data.container);
        } catch (err) {
            container.state = 'ERROR';
            await container.save();
            methods.container.state(container);
            return reject(err);
        }


        container.ports = con.ports || [];
        container.state = con.state;
        container.name = con.name;
        container.env = con.env;
        container.id = con.id;

        try {
            await container.save();
        } catch (err) {
            return reject(err);
        }


        if (container.ports.length > 0) {
            try {
                for (let item of container.ports) {
                    ctx.call('router.add.host', {
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

        resolve(container);
    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;