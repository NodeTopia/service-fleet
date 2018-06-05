const Jerkie = require('jerkie');

var mongoose = Jerkie.mongoose;
var Schema = mongoose.Schema;

var NodeSchema = new Schema({
    dockerId: {
        type: String
    },
    socketId: {
        type: String
    },
    address: {
        type: String
    },
    region: {
        type: String
    },
    region: {
        type: String
    },
    region: {
        type: String
    },
    environment: {
        type: String
    },
    name: {
        type: String
    },
    id: {
        type: String
    },
    url: {
        type: String
    },
    zone: {
        type: String
    },
    multitenant: {
        type: Boolean
    },
    memory: {
        used: Number,
        total: Number,
        reserved: Number,
        avalibale: Number
    },
    cores: {
        count: Number,
        used: [Number],
        avalibale: Number,
        loadavg: [Number]
    },
    is_active: {
        type: Boolean,
        'default': false
    },
    created_at: {
        type: Date,
        'default': Date.now
    },
    updated_at: {
        type: Date,
        'default': Date.now
    },
    last_used: {
        type: Date,
        'default': Date.now
    },
    closing: {
        type: Boolean,
        'default': false
    },
    reserved: {
        type: Boolean,
        'default': false
    }
});

NodeSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

NodeSchema.index({
    'memory.avalibale':1,
    'memory.avalibale':1,
    zone:1,
    closing:1,
    multitenant:1,
    reserved:1,
    is_active:1,
    last_used:1
})
module.exports = mongoose.model('Node', NodeSchema);