const Jerkie = require('jerkie');

let jerkie = new Jerkie({
    redis: process.env.REDIS_URI
});


async function stop() {
    console.log(await jerkie.call('fleet.container.stop', {
        id:'5dc353fd97b1303355b2258f'
    }));
}

stop();