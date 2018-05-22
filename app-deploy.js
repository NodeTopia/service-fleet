var nconf = require('nconf');
var async = require('async');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');
var helpers = require('nodetopia-lib/helpers');

var io = require('./io');
var utils = require('./utils');

kue.jobs.process('fleet.app.deploy', 999, function (job, done) {

    job.log('-----> Deploy starting');
    helpers.docs({
        name: job.data.name,
        build: job.data.build,
        organization: job.data.organization
    }, function (err, docs) {

        if (!docs.build) {
            return done()
        }

        console.log(docs)
        mongoose.Container.find({
            reference: docs.app._id,
            $or: [{
                'state': 'RUNNING'
            }, {
                'state': 'STARTING'
            }, {
                'state': 'INITIALIZING'
            }],
            type: {
                $nin: ['addon', 'build']
            }
        }, function (err, containers) {

            if (err)
                return done(err);

            var handleResponce = utils.handleResponce();

            utils.buildFormation(docs, function (err, formations) {
                if (err)
                    return done(err);

                function stop(cb) {
                    async.parallel(containers.map(function (container) {
                        return function (next) {
                            kue.fleet.container.stop({
                                container: container._id
                            }).then(function (data) {
                                next(null, data)
                            }).catch(next);
                        };
                    }), function (errs, res) {
                        handleResponce.stop(errs, res);
                        cb();
                    });
                }

                function start(cb) {
                    async.parallel(formations.map(function (formation) {
                        return function (next) {
                            kue.fleet.container.start(formation).then(function (data) {
                                next(null, data)
                            }).catch(next);
                        };
                    }), function (errs, res) {
                        handleResponce.start(errs, res);
                        cb();
                    });
                }

                stop(function () {
                    start(function () {

                        done(null, {
                            error: handleResponce.errors,
                            results: handleResponce.results
                        });
                    });
                });

            });

        });

    });
});
