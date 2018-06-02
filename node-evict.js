var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

var io = require('./io');
var utils = require('./utils');

kue.jobs.process('fleet.node.evict', async function (job, done) {


});
