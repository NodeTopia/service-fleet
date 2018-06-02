var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

var io = require('./io');
var utils = require('./utils');

kue.jobs.process('fleet.container.evict', async function (job, done) {
    let {id} = job.data;
    let container,
        node,
        err;

    [err, container] = await to(mongoose.Container.findOne({
        or: [{
            _id: id
        }, {
            id: id
        }, {
            uid: id
        }]
    }));

    [err, node] = await to(mongoose.Node.findOne({
        _id: container.node
    }));

    kue.fleet.container.start(formation).then(function (data) {
        next(null, data)
    }).catch(next);

});
