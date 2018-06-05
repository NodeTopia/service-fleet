'use strict';
const uuid = require('node-uuid');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'node.drain',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let io = ctx.io;
        let data = ctx.data;
        let schema = ctx.schema;
        let methods = ctx.methods;

        let {node: fromNode, force} = data;

        let node,
            containers;

        try {
            node = await schema.Node.findOne({
                $or: [{name: fromNode}, {id: fromNode}]
            });

            if (!node) {
                let err = new Error('Node not found for "' + fromNode + '" no need to stop');
                return reject(err);
            } else if (!node.closing) {
               // return reject(new Error('Node needs to be cordoned'));
            }
            containers = await schema.Container.find({
                node: node._id,
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


        let result = [];
        for (let container of containers) {
            try {
                result.push(await ctx.call('fleet.container.move', {id: container._id}))
            } catch (err) {
                result.push(err)
            }
        }
        try {
            containers = await schema.Container.find({
                node: node._id,
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

        resolve({
            moved: result,
            running: containers
        })

    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;