'use strict';
var generatePassword = require('password-generator');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'allocate.logs.redis',
        version: 1,
        concurrency: 1100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;
        let schema = ctx.schema;

        let zones = data.zones;
        let force = !!data.force;

        let redisModel;


        if (force) {
            redisModel = await schema.Redis.count({
                zone: zones[0].name,
                is_active: true
            });
        } else {
            try {
                redisModel = await schema.Redis.findOne({
                    zone: zones[0].name,
                    is_active: true
                });
            } catch (e) {
                console.log(e)
                return reject(e);
            }

            if (redisModel) {
                return resolve(redisModel);
            } else {
                redisModel = 0;
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
            "memory": 128,
            "memoryReservation": 128,
            "cpu": 512,
            "oomKillDisable": true
        };
        let stats = {
            host: 'api8.lab.nodetopia.xyz', port: 8125
        };
        let logs = await ctx.config.get('logs');

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


        let redisConfig = {
            reference: '5b135425c45cee080beec719',
            logSession: await ctx.config.get('logSession') || 'logSession',
            metricSession: await ctx.config.get('metricSession') || 'metricSession',

            organization: 'nodetopia',
            application: 'logs',
            type: 'service',
            source: 'redis',
            index: redisModel,

            env: {
                REDIS_PASS: generatePassword(32, false)
            },

            size: size,
            node: node,
            logs: logs,
            stats: stats,

            detectPort: {'6379/tcp': true},

            zones: zones,
            clean: false,
            image: 'tutum/redis',
            ports: ['6379/tcp']


        };

        let redisCon;


        try {
            redisCon = await ctx.call('fleet.container.start', redisConfig)
        } catch (e) {
            return reject(e);
        }

        redisModel = new schema.Redis({
            node: node._id,
            container: redisCon._id,
            host: node.address,
            port: redisCon.ports[0].port,
            password: redisConfig.env.REDIS_PASS,
            zone: node.zone,
            is_active: true
        });

        try {
            await redisModel.save();
        } catch (e) {
            return reject(e);
        }

        resolve(redisModel);
    },
    events: {
        async "fleet.state.stopping"(container) {
            await this.schema.Redis.updateOne({
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