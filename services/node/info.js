'use strict';
const uuid = require('node-uuid');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'GET',
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
    params: {
        node: {
            type: "string",
            length: 24
        }
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;
        let schema = ctx.schema;

        let {node: id} = data;

        let node;

        try {
            node = await schema.Node.findOne({
                _id: id
            });
        } catch (err) {
            return reject(err)
        }
        if (!node) {
            return reject(new Error('Node not found for "' + id + '" no need to stop'));
        }
        resolve(node)

    },
    events: {}
});

routes.push({
    meta: {
        method: 'POST',
        path: 'node.info.name',
        version: 1,
        concurrency: 100
    },
    params: {
        node: {
            type: "string",
            min: 3,
            max: 24
        }
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let data = ctx.data;
        let schema = ctx.schema;

        let {node: name} = data;

        let node;

        try {
            node = await schema.Node.findOne({
                name: name
            });
        } catch (err) {
            return reject(err)
        }
        if (!node) {
            return reject(new Error('Node not found for "' + name + '" no need to stop'));
        }
        resolve(node)

    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;