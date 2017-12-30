var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

function add(container) {
	if (container.type == 'web') {
		mongoose.App.findOne({
			_id : container.reference
		}, 'domains', function(err, app) {
			if (err)
				return errors.mongoose(err);
			container.ports.forEach(function(item) {
				kue.router.add.host({
					urls : app.domains.map(function(domain) {
						return domain.url;
					}),
					name : container.type + '.' + container.config.index,
					host : item.ip,
					port : item.port
				});
			});
		});
	}

}

function remove(container) {
	if (container.type == 'web') {
		mongoose.App.findOne({
			_id : container.reference
		}, 'domains', function(err, app) {
			if (err)
				return errors.mongoose(err);
			container.ports.forEach(function(item) {
				kue.router.remove.host({
					urls : app.domains.map(function(domain) {
						return domain.url;
					}),
					name : container.type + '.' + container.config.index,
					host : item.ip,
					port : item.port
				});
			});
		});
	}
}

kue.events.on('fleet.ports.add', add);
kue.events.on('fleet.ports.remove', remove);

