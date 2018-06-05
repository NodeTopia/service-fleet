'use strict';
const uuid = require('node-uuid');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'node.cordon',
        version: 1,
        concurrency: 100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;
        let schema = ctx.schema;

        let {node: nodeNameID} = data;

        let node;

        try {
            node = await schema.Node.findOne({
                $or: [{name: nodeNameID}, {id: nodeNameID}]
            });
            if (!node) {
                return reject(new Error('Node not found for "' + nodeNameID + '" no need to stop'));
            } else if (node.closing) {
                return reject(new Error('Node already cordoned'));
            }
            node.closing = true;
            await node.save();
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