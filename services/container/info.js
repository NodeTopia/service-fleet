'use strict';
const uuid = require('node-uuid');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'container.info.running',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;
        let schema = ctx.schema;

        let {reference} = data;

        let containers;

        try {
            containers = await schema.Container.find({
                reference: reference,
                $or: [{
                    state: 'RUNNING'
                }, {
                    state: 'STARTING'
                }, {
                    state: 'INITIALIZING'
                }],
            });
        } catch (err) {
            return reject(err)
        }

        resolve(containers)

    },
    events: {}
});

routes.push({
    meta: {
        method: 'POST',
        path: 'container.info.id',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;
        let schema = ctx.schema;

        let {reference, id} = data;

        let containers;

        try {
            containers = await schema.Container.findOne({
                reference: reference,
                _id: id
            });
        } catch (err) {
            return reject(err)
        }

        resolve(containers)

    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;