const Jerkie = require('jerkie');

const mongoose = Jerkie.mongoose;
const Schema = mongoose.Schema;

let LoggerSchema = new Schema({
    node: {
        type: Schema.ObjectId
    },
    container: {
        type: Schema.ObjectId
    },
    host: {
        type: String
    },
    web: {
        type: Number
    },
    view: {
        type: Number
    },
    udp: {
        type: Number
    },
    zone: {
        type: String
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
});

LoggerSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

LoggerSchema.index({
    zone: 1,
    container: 1,
    closing: 1,
    is_active: 1,
    last_used: 1
})
module.exports = mongoose.model('Logger', LoggerSchema);