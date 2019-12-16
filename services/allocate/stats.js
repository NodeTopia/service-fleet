'use strict';
var generatePassword = require('password-generator');
/**
 * Routes
 */

let routes = [];


routes.push({
    meta: {
        method: 'POST',
        path: 'allocate.stats',
        version: 1,
        concurrency: 1
    },
    service: async function (resolve, reject) {

    },
    events: {}
});


/**
 * Export
 */

module.exports = routes;