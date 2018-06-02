var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

var io = require('./io');
var utils = require('./utils');

getZone = function (options, cb) {
    let query = {};

    query = {
        $or: options.zones.map(function (zone) {
            return {
                zone: zone.name
            };
        }),
        'memory.avalibale': {
            $gte: options.size.memory
        },
        'cores.avalibale': {
            $gte: options.size.cpu
        },
        closing: false,
        multitenant: true
    };
    if (options.size.dedicated) {
        query.multitenant = false;
        query['memory.used'] = 0;
    }
    if (options.reserved) {
        query.reserved = true;
    } else {
        query.is_active = true;
    }

    if (options.exclude.length > 0) {
        query._id = {$ne: options.exclude}
    }

    return new Promise(function (resolve, reject) {

        mongoose.Node.findOne(query, null, {
            sort: {
                last_used: 1
            }
        }, function (err, node) {
            if (err) {
                return reject(err);
            }
            if (!node) {
                return reject();
            }
            node.last_used = Date.now();
            node.save(function () {
                resolve(node);
            });
        });
    })

}


let last = Date.now()
kue.jobs.process('fleet.allocate.resources', 1, async function (job, done) {
    let start = Date.now()

    let {size, zones, tags = [], exclude = []} = job.data;


    let err,
        node;

    [err, node] = await utils.to(getZone({
        size: size,
        zones: zones,
        tags: tags,
        exclude: exclude
    }));

    if (err) {
        return done(err)
    } else if (!node) {
        return done(new Error('no node found'))
    }


    try {
        await mongoose.Node.update({
            _id: node._id
        }, {
            $inc: {
                'memory.avalibale': -size.memory,
                'memory.used': size.memory,
                'cores.avalibale': -size.cpu
            }
        });

        console.log(`fleet.allocate.resources: ${Date.now() - start}ms - ${start - last}ms`);
        last = start
        done(null, {
            node: node,
            size: size
        })
    } catch (err) {
        return done(err)
    }


});
