'use strict';

/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'allocate.resources',
        version: 1,
        concurrency: 1100
    },
    service: async function (resolve, reject) {

        let ctx = this;
        let utils = ctx.methods.utils;
        let data = ctx.data;
        let schema = ctx.schema;

        let {size, zones = [], tags = [], exclude = []} = data;


        let err,
            node;

        [err, node] = await utils.to(utils.getZone({
            size: size,
            zones: zones,
            tags: tags,
            exclude: exclude
        }));
        if (err) {
            return reject(err)
        } else if (!node) {
            return reject(new Error('no node found'))
        }


        try {
            await schema.Node.update({
                _id: node._id
            }, {
                $inc: {
                    'memory.avalibale': -size.memory,
                    'memory.used': size.memory,
                    'cores.avalibale': -size.cpu
                }
            }).exec();

            resolve({
                node: node,
                size: size
            })
        } catch (err) {
            return reject(err)
        }
    },
    events: {

    }
});


/**
 * Export
 */

module.exports = routes;