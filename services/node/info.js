'use strict';
const uuid = require('node-uuid');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'node.info.all',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;
        let schema = ctx.schema;


        let nodes;

        try {
            nodes = await schema.Node.find({});
        } catch (err) {
            return reject(err)
        }

        resolve(nodes)

    },
    events: {}
});

routes.push({
    meta: {
        method: 'POST',
        path: 'node.info.id',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;
        let schema = ctx.schema;

        let {node: idOrName} = data;

        let node;

        try {
            node = await schema.Node.findOne({
                $or: [{name: idOrName}, {id: idOrName}]
            });
        } catch (err) {
            return reject(err)
        }

        resolve(node)

    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;