module.exports = function (socket, id) {
    return new Promise(function (resolve, reject) {
        socket.emit('stop', id, function (err, con) {
            if (err) {
                reject(err);
            } else {
                resolve(con);
            }
        })
    })
}