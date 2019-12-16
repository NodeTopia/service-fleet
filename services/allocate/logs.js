'use strict';
var generatePassword = require('password-generator');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'allocate.logs',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;

        let zones = data.zones || [{
            "name" : "par1",
        }];

        try {
            let redis = await ctx.call('fleet.allocate.logs.redis', {
                zones: zones,
                force: false
            });

            let logs = await ctx.call('fleet.allocate.logs.logger', {
                zones: zones,
                redis: redis,
                force: false
            });

            resolve(logs);
        } catch (e) {
            console.log('allocate.logs', e)
            return reject(e);
        }

    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;