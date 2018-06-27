const {ObjectId} = require('mongodb');
const moment = require('moment');
require('moment/locale/he');
const Lesson = require('../models/Lesson');
const Client = require('../models/Client');

function getDayHours () {
    const startOfDay = moment().startOf('day');
    const endOfDay = moment().endOf('day');
  
    const hours = [];
    let hour = startOfDay;
  
    while (hour <= endOfDay) {
      const hourNumber = hour.hour()
      let index
      if (hourNumber < 7) {
        index = hourNumber + 17
      } else {
        index = hourNumber - 7
      }
  
      hours[index] = hour;
      hour = hour.clone().add(1, 'h');
    }
    return hours
}

function getWeek (offset) {
    const startOfWeek = moment().startOf('week').add(offset, 'w');
    const endOfWeek = moment().endOf('week').add(offset, 'w');
    const today = moment().startOf('day');    
  
    const days = [];
    let day = startOfWeek;
  
    while (day <= endOfWeek) {
        days.push(day);
        day = day.clone().add(1, 'd');
    }
    return days
}

async function isLessonInTime (req) {
    const newLessonMinutes = req.body.duration === 'hour' ? 60 : 45;
    const newLessonEndDate = moment(req.body.date).add(newLessonMinutes, 'm').toDate();
    const except = req.params.id ? `(this._id != '${req.params.id}') && ` : ''

    const lessonInTime = await Lesson.findOne({
        $where: `function () {
            var lessonMinutes = this.date === 'hour' ? 60 : 45;
            var lessonEndDate =  new Date(this.date.getTime() + lessonMinutes * 60000);
            return ${except}((new Date('${newLessonEndDate}') > this.date && new Date('${newLessonEndDate}') < lessonEndDate) || 
            (new Date('${req.body.date}') > this.date && new Date('${req.body.date}') < lessonEndDate));}`
    });
    return !(!lessonInTime)
}

exports.getLessons = async (req, res) => {
    const clientId = req.query.client;
    const options = clientId ? {_client: clientId} : {};

    const offset = parseInt(req.query.offset) || 0; // TODO: Validate offset
    const days = getWeek(offset);
    const hours = getDayHours();
    const firstDate = days[0].toDate();
    firstDate.setHours(hours[0].hour());
    const lastDate = days[6].clone().add(1, 'd').toDate();
    lastDate.setHours(hours[23].hour());

    const lessons = await Lesson.find(Object.assign({
        date: {
            $gte: firstDate,
            $lte: lastDate
        }
    }, options));

    for (let lesson of lessons) {
        const client = await Client.findOne({_id: lesson._client}, {name: 1, _id: 0});
        lesson.clientName = client.name;
    }

    res.render('lesson/lessons', {
        title: 'לוז',
        week: days.map(d => d.format('dddd DD-MM')),
        hours: hours.map(h => h.format('HH:mm')),
        lessons,
        offset,
        today: !offset ? new Date().getDay() : undefined
    });
}

exports.getAddLesson = async (req, res) => {
    let clientId
    let date
    if (req.query.client) {
        const client = await Client.findById(req.query.client)
        clientId = client._id
    }
    if (req.query.date) {
        let [day, hour] = req.query.date.split('-');
        let offset = parseInt(req.query.offset) || 0;
        const time = moment(hour, 'HH:mm');
        const startOfWeek = moment().startOf('week').add(offset, 'w');

        date = startOfWeek.clone().add(parseInt(day), 'd');
        date.set({
            hour: time.get('hour'),
            minute: time.get('minute')
        });
        date = date.toDate()
    }
    console.log(date);
    

    const clients = await Client.find()
    return res.render('lesson/addLesson', {
        title: 'הוסיפי שיעור',
        clients,
        clientId,
        date
    });
}

/**
 * POST /add-lesson
 * Create a new client
 * @param {Request} req 
 * @param {Response} res 
 * @param {callback} next 
 */
exports.addLesson = async (req, res, next) => {
    req.assert('title', 'נא בחרי כותרת לשיעור.').isString();
    // TODO: validate date
    req.assert('client', 'נא בחרי לקוח קיים.').isString();
    if (req.body.specialPrice) {
        req.assert('specialPrice', 'נא מלאי מחיר מיוחד תקני.').isInt();
    }
    req.assert('duration', 'נא בחרי משך שיעור תקני.').isString(); // TODO: validate enum

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/add-lesson')
    }

    let client
    try {
        client = await Client.findById(req.body.client)
    } catch (e) {}

    if (!client) {
        req.flash('errors', { msg: 'הלקוח שנבחר לא קיים.' });
        return res.redirect('/add-lesson')
    }
    
    if (await isLessonInTime(req)) {
        req.flash('errors', { msg: 'קיים שיעור בזמן שנבחר.' });
        return res.redirect('/add-lesson')
    }

    const lesson = new Lesson({
        title: req.body.title,
        _client: req.body.client,
        price: req.body.specialPrice || client.tariff[req.body.duration],
        date: req.body.date,
        duration: req.body.duration
    })

    await lesson.save()
    req.flash('success', { msg: 'השיעור נוצר בהצלחה.' });    
    res.redirect(`/lessons/${lesson._id}`)
}

exports.getLesson = async (req, res) => {
    try {
        const [lesson] = await Lesson.aggregate([
            {$lookup: {
                from: 'clients',
                localField: '_client',
                foreignField: "_id",
                as: 'client'
            }},
            {$unwind: '$client'},
            {$match: {
                _id: ObjectId(req.params.id)
            }}
        ]);

        return res.render('lesson/lesson', {
            title: 'שיעור',
            lesson
        });
    } catch (e) {
        console.log(e);
        return res.sendStatus(404);
    }
}

exports.updateLesson = async(req, res, next) => {
    req.assert('title', 'נא בחרי כותרת לשיעור.').isString();
    // TODO: validate date
    if (req.body.specialPrice) {
        req.assert('specialPrice', 'נא מלאי מחיר מיוחד תקני.').isInt();
    }
    req.assert('duration', 'נא בחרי משך שיעור תקני.').isString(); // TODO: validate enum
    req.assert('status', 'נא בחרי סטטוס תקני.').isString(); // TODO: Validate enum

    const errors = req.validationErrors();

    if (errors) {
        req.flash('errors', errors);
        return res.redirect(`/lessons/${req.params.id}`)
    }

    if (await isLessonInTime(req)) {
        req.flash('errors', { msg: 'קיים שיעור בזמן שנבחר.' });
        return res.redirect('back')
    }

    const lesson = await Lesson.findById(req.params.id);
    lesson.date = req.body.date;
    lesson.title = req.body.title;
    if (req.body.specialPrice) {
        lesson.price = req.body.specialPrice;
    }
    lesson.duration = req.body.duration;
    lesson.status = req.body.status;
    await lesson.save()

    req.flash('success', { msg: 'השיעור עודכן בהצלחה.' });    
    res.redirect(`/lessons/${lesson._id}`);
}