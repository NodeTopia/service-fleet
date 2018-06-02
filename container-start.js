var nconf = require('nconf');
var uuid = require('node-uuid');

var mongoose = require('nodetopia-model').start(nconf.get('mongodb'));
var kue = require('nodetopia-kue');

var io = require('./io');


kue.jobs.process('fleet.container.start', 999, async function (job, done) {

    let result

    try {
        result = await kue.fleet.allocate.resources({
            size: job.data.container.size,
            zones: job.data.container.zones
        });
    } catch (err) {
        kue.events.emit('fleet.error', err);
        return done(err);
    }

    let node = result.node;
    let size = result.size;

    let socket = io.sockets.connected[node.socketId];

    if (!socket) {
        err = new Error('The node that the container was going to run on is not loger active');
        kue.events.emit('fleet.error', err);
        return done(err);
    }


    if (job.data.container.restartable === undefined) {
        job.data.container.restartable = true;
    }

    job.data.container.uid = job.data.container.uid || uuid.v4();
    job.data.container.size = size;
    job.data.container.logs = nconf.get('logs');

    var container = new mongoose.Container({
        reference: job.data.reference,
        node: node._id,
        uid: job.data.container.uid,
        restartable: job.data.container.restartable,
        shortLived: !!job.data.container.shortLived,
        is_restart: job.data.container.is_restart,
        type: job.data.type,
        state: 'INITIALIZING',
        config: job.data.container
    });

    try {
        await container.save();
    } catch (err) {
        kue.events.emit('fleet.error', err);
        return done(err);
    }


    kue.events.emit('fleet.state.' + container.state.toLocaleLowerCase(), container);
    let con;
    try {
        con = await io.static.start(socket, job.data.container);
    } catch (err) {
        container.state = 'ERROR';
        await container.save();
        kue.events.emit('fleet.state.' + container.state.toLocaleLowerCase(), container);
        kue.events.emit('fleet.error', err);
        return done(err);
    }


    container.ports = con.ports || [];
    container.state = con.state;
    container.name = con.name;
    container.env = con.env;
    container.id = con.id;

    try {
        await container.save();
    } catch (err) {
        kue.events.emit('fleet.error', err);
        return done(err);
    }


    if (container.ports.length > 0) {
        kue.events.emit('fleet.ports.add', container);
    }

    done(null, container);

});

