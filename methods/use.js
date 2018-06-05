module.exports = async function (socket, next) {
    let ctx = this;
    let schema = ctx.schema;
    let handshakeData = socket.request;
    let id = handshakeData._query.id;
    let token = handshakeData._query.token;

    if (token === 'Oy23G0PX4xd85lp') {
        schema.Node.findOne({
            id: id
        }, function (err, node) {
            if (err) {
                ctx.broadcast('fleet.error', err);
                return next(err);
            }

            if (!node) {
                node = new schema.Node({
                    id: id
                });
            }
            node.socketId = socket.id;
            node.save(next);
        });
    } else {
        var err = new Error('auth failed');
        ctx.broadcast('fleet.error', err);
        next(err);
    }
}