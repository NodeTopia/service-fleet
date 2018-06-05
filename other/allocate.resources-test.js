const Jerkie = require('../../Jerkie/index');

let jerkie = new Jerkie({
    redis: process.env.REDIS_URI
});


async function loop() {
    console.log(await jerkie.call('fleet.allocate.resources', {
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
        }]
    }))

    setTimeout(loop, 0)
}

setTimeout(loop, 0)