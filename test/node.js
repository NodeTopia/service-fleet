let assert = require('assert');
const Jerkie = require('jerkie');

let jerkie = new Jerkie({
    redis: process.env.REDIS_URI
});

function config(i) {
    var containerConfig = {
        reference: '5b135425c45cee080beec719',
        type: 'addon',
        exclude: ['node-02'],
        container: {
            logSession: 'logSession',
            metricSession: 'metricSession',
            user: 'root',
            source: 'redis',
            process: 'addon',
            channel: 'redis.' + i || 0,
            name: 'flybyme.someapp.redis',
            index: i || 0,
            env: {
                REDIS_PASS: 'other-password'
            },
            stats: {
                host: '127.0.0.1', port: 8125
            },
            "logs": {
                "web": {
                    "port": 5000,
                    "host": "51.15.225.81"
                },
                "udp": {
                    "port": 5001,
                    "host": "51.15.225.81"
                },
                "view": {
                    "port": 5000,
                    "host": "51.15.225.81"
                }
            },
            username: 'flybyme',
            size: {
                "io": {
                    "bandwidth": 10,
                    "iops": 10
                },
                "system": false,
                "dedicated": false,
                "type": "1S",
                "memory": 64,
                "memoryReservation": 48,
                "cpu": 50,
                "oomKillDisable": true
            },
            zones: [{
                name: 'par1'
            }],
            exclude: ['tutum/redis'],
            image: 'tutum/redis',
            ports: ['6379/tcp']
        }
    };
    return containerConfig;
}

describe('Node', function () {
    describe('node corden', function () {
        before(async function () {
            try {
                await jerkie.call('fleet.node.uncordon', {node: 'node-01'})
            } catch (err) {

            }
        });
        it('should return node.closing=true', async function () {
            let node = await jerkie.call('fleet.node.cordon', {node: 'node-01'})
            assert.equal(node.id, 'node-01');
            assert.equal(node.closing, true);
        });
        it('should return node.closing=false', async function () {
            let node = await jerkie.call('fleet.node.uncordon', {node: 'node-01'})
            assert.equal(node.id, 'node-01');
            assert.equal(node.closing, false);
        });
    });
    describe('node drain', function () {

        let container;
        this.timeout(15000);
        before(async function () {
            try {
                container = await jerkie.call('fleet.container.start', config())
            } catch (err) {
                console.log(err)
            }
            try {
                await jerkie.call('fleet.node.cordon', {node: 'node-01'})
            } catch (err) {
                //console.log(err)

            }
        });
        after(async function () {
            try {
                await jerkie.call('fleet.node.uncordon', {node: 'node-01'})
            } catch (err) {

            }
            try {
                await jerkie.call('fleet.container.stop', {id: container._id})
            } catch (err) {
                console.log(err)
            }
        });
        it('should return result.running.length=0', async function () {
            let result = await jerkie.call('fleet.node.drain', {node: 'node-01'});
            console.log(result)
            assert.equal(result.moved.length, 1);
            assert.equal(result.moved[0].node.id, 'node-01');
            container = result.moved[0].newContainer;
            assert.equal(result.running.length, 0);
        });
    });
    describe('contianer', function () {

        let container;
        this.timeout(15000);


        let c = config()
        it('fleet.container.start should return container.name=config.container.name', async function () {
            container = await jerkie.call('fleet.container.start', c)
            assert.equal(container.name, c.container.name);
            assert.equal(container.state, 'RUNNING');

        });
        it('fleet.container.stop should return container.name=config.container.name', async function () {
            container = await jerkie.call('fleet.container.stop', {
                id: container._id
            })
            assert.equal(container.name, c.container.name);
            assert.equal(container.state, 'STOPPED');
        });
    });
});