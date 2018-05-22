var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

var io = require('./io');
var utils = require('./utils');

kue.jobs.process('fleet.allocate.resources', 1, async function (job, done) {
    var size = job.data.size;
    var zones = job.data.zones;

    let err,
        node;

    [err, node] = await utils.to(mongoose.Node.getZone({
        size: size,
        zones: zones
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
        done(null, {
            node: node,
            size: size
        })
    } catch (err) {
        return done(err)
    }


});
