var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');
var Minio = require('minio');
var minioClient = new Minio.Client(nconf.get('s3'));

kue.jobs.process('fleet.container.restart', 999, function (job, done) {
    var id = job.data.id;
    mongoose.Container.findOne({
        _id: id
    }, function (err, container) {
        if (err) {
            kue.events.emit('fleet.error', err);
            return done(err);
        }
        if (!container) {
            err = new Error('container not found for ' + id);
            kue.events.emit('fleet.error', err);
            return done(err);
        }

        container.is_restart = true;

        function onStart(err, data) {
            if (err) {
                kue.events.emit('fleet.error', err);
                return done(err);
            }

            container.is_restart = false;

            container.save(function (err) {
                if (err) {
                    kue.events.emit('fleet.error', err);
                    return done(err);
                }
                done(null, data);
            });

        }

        async function onSave(err) {
            if (err) {
                kue.events.emit('fleet.error', err);
                return done(err);
            }

            let url;

            try {
                let formation = await mongoose.Formation.findOne({
                    app: container.reference
                })

                if (formation) {
                    let build = await mongoose.Build.findOne({
                        app: container.reference,
                        is_active: true
                    })
                    if (build) {
                        url = await minioClient.presignedGetObject('tar', build.build.path, 15 * 60, {});
                    }
                }

            } catch (err) {
                console.log(err)
            }
            if (url) {
                container.config.cmd = ['/run.sh', container.config.process, url]
            }

            kue.fleet.container.start({
                reference: container.reference,
                type: container.type,
                container: container.config
            }).then(function (data) {
                onStart(null, data)
            }).catch(onStart);

        }


        container.save(onSave);
    });

});
