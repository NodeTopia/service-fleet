var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

kue.jobs.process('fleet.container.restart', 999, function(job, done) {
	var id = job.data.id;
	mongoose.Container.findOne({
		_id : id
	}, function(err, container) {
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

			//container.is_restart = false;

			container.save(function(err) {
				if (err) {
					kue.events.emit('fleet.error', err);
					return done(err);
				}
				done(null, data);
			});

		}

		function onSave(err) {
			if (err) {
				kue.events.emit('fleet.error', err);
				return done(err);
			}

			kue.fleet.start({
				container : container.config
			}, onStart);

		}


		container.save(onSave);
	});

});
