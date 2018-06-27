const mongoose = require('mongoose');
const client = require('./Client')

const paymentSchema = new mongoose.Schema({
  amount: Number,
  method: {type: String, enum: ['check', 'cash'], default: 'cash'},
  date: {type: Date, default: Date.now()},
}, { timestamps: true });

module.exports = paymentSchema;
