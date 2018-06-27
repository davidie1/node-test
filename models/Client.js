const mongoose = require('mongoose');
const crypto = require('crypto');
const Lesson = require('./Lesson');
const PaymenSchema = require('./PaymentSchema')

const clientSchema = new mongoose.Schema({
  name: {type: String, unique: String, required: true},
  sex: {
    type: String,
    enum: ['male', 'female'],
    default: 'female'
  },
  age: Number,
  city: {
    type: String,
    enum: ['kiryat yearim', 'mevaseret', 'beit shemesh'],
    default: 'kiryat yearim'
    // TODO: Check about more cities.
  },
  email: { type: String, required: false},
  phoneNumber: {type: String, required: false},
  lessons: [{type: mongoose.Schema.Types.ObjectId, ref: 'Lesson'}],
  payments: [PaymenSchema],
  tariff: {
      hour: Number,
      fortyFiveMinutes: Number
      // TOOD: check about more tariffs
  }
}, { timestamps: true });

/**
 * Helper method for getting client's gravatar.
 */
clientSchema.methods.gravatar = function gravatar(size) {
  if (!size) {
    size = 200;
  }
  if (!this.name) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }
  const md5 = crypto.createHash('md5').update(this.name).digest('hex');
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
