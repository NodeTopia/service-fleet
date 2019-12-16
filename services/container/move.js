'use strict';
const uuid = require('node-uuid');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'container.move',
        version: 1,
        concurrency: 100
    },
    middleware: {
        container: async function (resolve, reject) {
            let container;
            try {
                container = await this.schema.Container.findOne({
                    _id: this.data.id
                });
                if (!container) {
                    return reject(new Error('Container not found for ' + this.data.id));
                }
            } catch (err) {
                return reject(err)
            }

            resolve(container)
        },
        node: async function (resolve, reject) {
            let node;
            try {
                node = await this.schema.Node.findOne({
                    _id: this.middleware.container.node
                });
                if (!node) {
                    return reject(new Error('Node not found for "' + this.middleware.container.node + '" no need to stop'));
                }
            } catch (err) {
                return reject(err)
            }

            resolve(node)
        },
        toNodeModel: async function (resolve, reject) {
            let toNodeModel;
            if (this.data.node) {
                try {
                    toNodeModel = await this.schema.Node.findOne({
                        $or: [{name: this.data.node}, {id: this.data.node}]
                    });
                    if (!toNodeModel) {
                        return reject(new Error('Node not found for "' + this.data.toNode + '" no need to stop'));
                    }
                } catch (err) {
                    return reject(err);
                }
            }

            resolve(toNodeModel);
        }
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let io = ctx.io;
        let data = ctx.data;
        let schema = ctx.schema;
        let methods = ctx.methods;

        let {id, node: toNode} = data;
        let {container, node, toNodeModel} = ctx.middleware;

        container.is_restart = true;

        try {
            await container.save();
        } catch (err) {
            return reject(err);
        }

        let newContainer;
        try {
            newContainer = await ctx.call('fleet.container.start', {
                reference: container.reference,
                type: container.type,
                container: container.config,
                node: toNodeModel
            })
        } catch (err) {
            return reject(err);
        }

        container.is_restart = false;

        try {
            await container.save();
            container = await ctx.call('fleet.container.stop', {
                id: container._id
            })
        } catch (err) {
            return reject(err);
        }

        resolve({
            container: container,
            node: node,
            toNodeModel: toNodeModel,
            newContainer: newContainer
        })

    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;