const Jerkie = require('jerkie');

const mongoose = Jerkie.mongoose;
const Schema = mongoose.Schema;

let RedisSchema = new Schema({
    node : {
        type : Schema.ObjectId
    },
    container: {
        type: Schema.ObjectId
    },
    host: {
        type: String
    },
    port: {
        type: Number
    },
    password: {
        type: String
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

RedisSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

RedisSchema.index({
    zone: 1,
    container: 1,
    closing: 1,
    is_active: 1,
    last_used: 1
})
module.exports = mongoose.model('Redis', RedisSchema);