const mongoose = require('mongoose');
const Client = require('./Client');

const lessonSchema = new mongoose.Schema({
  title: String,
  _client: {type: mongoose.Schema.Types.ObjectId, ref: 'Client'},
  date: {
    type: Date,
    default: Date.now(),
    required: true
  },
  duration: { // TODO: Check about more duration types
    type: String,
    enum: ['hour', 'fortyFiveMinutes'],
    default: 'fortyFiveMinutes'
  },
  price: Number,
  status: {
      type: String,
      enum: ['attending', 'canceled', 'postponed'],
      default: 'attending'
  },
}, { timestamps: true });

const Lesoon = mongoose.model('Lesson', lessonSchema);
module.exports = Lesoon;
