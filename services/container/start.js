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
        console.log(data)
        let node,
            size;


        if (data.node) {
            node = data.node;
            size = data.size;
        } else {
            let result;

            try {
                result = await ctx.call('fleet.allocate.resources', {
                    size: data.size,
                    zones: data.zones || [],
                    exclude: data.exclude || []
                });
            } catch (err) {
                return reject(err);
            }

            node = result.node;
            size = result.size;
        }

        let stats;
        let logs;

        if (!data.logs) {
            try {
                logs = await ctx.call('fleet.allocate.logs', {
                    zones: data.zones
                });
            } catch (e) {
                return reject(e);
            }
            if (!logs) {
                try {
                    logs = await ctx.call('fleet.allocate.logs', {
                        zones: [{
                            name: node.zone
                        }]
                    });
                } catch (e) {
                    return reject(e);
                }
            }
        } else {
            logs = data.logs;
        }
        if (false)
            if (!data.stats) {
                try {
                    stats = await ctx.config.get('stats');
                } catch (e) {
//
                }
                if (!stats) {
                    try {
                        stats = await ctx.call('fleet.allocate.stats');
                    } catch (e) {
                        stats = {
                            host: '127.0.0.1', port: 8125
                        };
                    }
                }
            }
        stats = {
            host: 'api8.lab.nodetopia.xyz', port: 8125
        };
        let containerConfig = {
            reference: data.reference,
            type: data.type,
            exclude: data.exclude || [],
            shortLived: data.shortLived,
            restartable: data.restartable,
            container: {
                logSession: data.logSession,
                metricSession: data.metricSession,
                user: 'root',
                source: data.source,
                process: data.type,
                channel: `${data.source}.${data.index}`,
                name: `${data.organization}.${data.application}.${data.source}`,
                index: data.index,
                env: data.env,
                stats: stats,
                logs: logs,
                username: data.organization,
                size: size,
                zones: data.zones,
                exclude: data.clean ? [] : [data.image],
                image: data.image,
                cmd: data.cmd,
                ports: data.ports || [],
                detectPort: data.detectPort,
                dns: data.dns || ["8.8.8.8"],

                restartable: data.restartable,

                uid: data.uid || uuid.v4()
            }
        };

        if (data.PortBindings) {
            containerConfig.container.PortBindings = data.PortBindings;
        }


        let container = new schema.Container({
            reference: data.reference,
            node: node._id,
            uid: containerConfig.container.uid,
            restartable: !!containerConfig.restartable,
            shortLived: !!containerConfig.shortLived,
            is_restart: containerConfig.is_restart,
            type: data.type,
            state: 'INITIALIZING',
            config: containerConfig.container
        });

        try {
            await container.save();
        } catch (err) {
            return reject(err);
        }

        let socket = io.sockets.connected[node.socketId];

        if (!socket) {
            let err = new Error('The node that the container was going to run on is not longer active');
            return reject(err);
        }

        methods.container.state(container);

        let con;
        try {
            con = await methods.socket.start(socket, containerConfig.container);
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

        resolve(container);
    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;