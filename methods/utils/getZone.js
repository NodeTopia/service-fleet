module.exports = function (options) {

    let schema = this.schema;

    let query = {};
    query = {
        $or: options.zones.map(function (zone) {
            return {
                zone: zone.name
            };
        }),
        'memory.avalibale': {
            $gte: options.size.memory
        },
        'cores.avalibale': {
            $gte: options.size.cpu
        },
        closing: false,
        cordoned: false,
        multitenant: true
    };
    if (options.size.dedicated) {
        query.multitenant = false;
        query['memory.used'] = 0;
    }
    if (options.reserved) {
        query.reserved = true;
    } else {
        query.is_active = true;
    }

    if (options.exclude.length > 0) {
        query.id = {$ne: options.exclude}
    }
    return new Promise(function (resolve, reject) {

        schema.Node.findOne({}, null, {
            sort: {
                last_used: 1
            }
        }, function (err, node) {
            if (err) {
                return reject(err);
            }
            if (!node) {
                return reject();
            }
            node.last_used = Date.now();
            node.save(function () {
                resolve(node);
            });
        });
    })
}