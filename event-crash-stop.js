var nconf = require('nconf');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

async function removeUsage(container) {
    var nodeUpdate = {
        $inc: {
            'memory.avalibale': container.config.size.memory,
            'memory.used': -container.config.size.memory,
            'cores.avalibale': container.config.size.cpu
        }
    };


    mongoose.Node.update({
        _id: container.node
    }, nodeUpdate, function (err) {
        if (err) {
            kue.events.emit('fleet.error', err);
        }

    });
    try {
        let app = await mongoose.App.findOne({
            _id: container.reference
        })
        if (app) {

            mongoose.Quota.update({_id: app.organization.quota._id}, {
                $inc: {
                    'processes': -1,
                    'cpu': -container.config.size.cpu,
                    'memory': -container.config.size.memory
                }
            },function(){

            });
        }
    } catch (e) {

    }
}

function crashStop(container) {
    console.log('statusCode',container.statusCode)
    if (container.is_stopping) {
        return;
    }
    if (container.is_restart) {
        return;
    }

    if (container.restartable) {
        return kue.fleet.container.restart({
            id: container._id
        });
    }
    if (container.type === 'addon') {
        kue.events.emit('addon.stop.' + container.uid, container);
    }
    if (container.type === 'build') {
        kue.events.emit('build.complete.' + container.uid, container);
    }

}

function zombie(container) {
    if (container.ports.length > 0) {
        kue.events.emit('fleet.ports.remove', container);
    }
}

kue.events.on('fleet.state.zombie', zombie);

kue.events.on('fleet.state.crashed', crashStop);
kue.events.on('fleet.state.stopped', crashStop);

kue.events.on('fleet.state.crashed', removeUsage);
kue.events.on('fleet.state.stopped', removeUsage);
