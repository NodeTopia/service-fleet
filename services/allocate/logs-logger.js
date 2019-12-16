'use strict';
var generatePassword = require('password-generator');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'allocate.logs.logger',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;
        let schema = ctx.schema;

        let zones = data.zones;
        let force = !!data.force;
        let redis = data.redis;

        let loggerModel;

        if (force) {
            loggerModel = await schema.Logger.count({
                zone: zones[0].name,
                is_active: true
            });
        } else {
            try {
                loggerModel = await schema.Logger.findOne({
                    zone: zones[0].name,
                    is_active: true
                });
            } catch (e) {
                return reject(e);
            }

            if (loggerModel) {
                return resolve({
                    "web": {
                        "port": loggerModel.web,
                        "host": loggerModel.host
                    },
                    "udp": {
                        "port": loggerModel.udp,
                        "host": loggerModel.host
                    },
                    "view": {
                        "port": loggerModel.view,
                        "host": loggerModel.host
                    }
                });
            } else {
                try {
                    loggerModel = await schema.Logger.count({
                        zone: zones[0].name,
                        is_active: true
                    });
                } catch (e) {
                    return reject(e);
                }
            }
        }


        let size = {
            "io": {
                "bandwidth": 10,
                "iops": 10
            },
            "system": false,
            "dedicated": false,
            "type": "1S",
            "memory": 512,
            "memoryReservation": 512,
            "cpu": 512,
            "oomKillDisable": true
        };

        let stats = {
            host: 'api8.lab.nodetopia.xyz', port: 8125
        };

        let logs = await ctx.config.get('logs');

console.log(logs)
        let node;

        try {
            node = await ctx.call('fleet.allocate.resources', {
                size: size,
                zones: zones,
                exclude: []
            });
            node = node.node;
        } catch (err) {
            return reject(err);
        }


        let loggerConfig = {
            reference: '5b135425c45cee080beec719',
            logSession: await ctx.config.get('logSession') || 'logSession',
            metricSession: await ctx.config.get('metricSession') || 'metricSession',

            organization: 'nodetopia',
            application: 'logs',
            type: 'service',
            source: 'logger',
            index: loggerModel,

            env: {
                DB_PORT_6379_TCP_PORT: redis.port,
                DB_PORT_6379_TCP_ADDR: redis.host,
                DB_ENV_REDIS_PASS: redis.password
            },

            size: size,
            node: node,
            logs: logs,
            stats: stats,

            detectPort: {'5000/tcp': true},

            zones: zones,
            clean: false,
            image: 'mangoraft/logster:0.2.16',
            ports: ['5000/tcp', '5001/udp']

        };

        let loggerCon;

        try {
            loggerCon = await ctx.call('fleet.container.start', loggerConfig)
        } catch (e) {
            return reject(e);
        }
        loggerModel = new schema.Logger({
            node: node._id,
            container: loggerCon._id,
            host: node.address,
            port: loggerCon.ports[0].port,
            web: loggerCon.ports[0].port,
            view: loggerCon.ports[0].port,
            udp: loggerCon.ports[1].port,
            zone: node.zone,
            is_active: true
        });

        try {
            await loggerModel.save();
        } catch (e) {
            return reject(e);
        }


        resolve({
            "web": {
                "port": loggerModel.web,
                "host": loggerModel.host
            },
            "udp": {
                "port": loggerModel.udp,
                "host": loggerModel.host
            },
            "view": {
                "port": loggerModel.view,
                "host": loggerModel.host
            }
        });
    },
    events: {
        "fleet.state.stopping"(container) {
            this.schema.Logger.updateOne({
                container: container._id
            }, {
                is_active: false
            }).exec();
        }
    }
});


/**
 * Export
 */

module.exports = routes;