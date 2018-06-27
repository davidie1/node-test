const crypto = require('crypto');
const moment = require('moment');
const {ObjectId} = require('mongodb');
const Client = require('../models/Client');
const Lesson = require('../models/Lesson');

function validateClient (req) {
    req.assert('name', 'נא מלאי את השם.').isString();
    if (req.body.email) {
        req.assert('email', 'נא מלאי אימייל תקין.').isEmail();
        req.sanitize('email').normalizeEmail({ gmail_remove_dots: false });
    }
    if (req.body.phoneNumber) {
        req.assert('phoneNumber', 'נא מלאי מספר טלפון תקני.').len(7);
    }
    req.assert('hourTariff', 'נא הכניסי תעריף לפי שעה במספר שלם.').isInt();
    req.assert('fortyFiveMinutesTariff', 'נא הכניסי תעריף לפי שלושת רבעי שעה במספר שלם.').isInt()
    req.assert('sex', 'נא בחרי מין.').isString() // TODO: Validate enum.
    req.assert('city', 'נא בחרי עיר.').isString() // TODO: Validate enum.
    if (req.body.age) {
        req.assert('age', 'נא בחרי גיל.') // TODO: Validate number.
    }
    
    return req.validationErrors();
}

function validatePayment (req) {
    // TODO: Validate date
    req.assert('amount', 'נא הכניסי סכום במספר שלם.').isInt();
    req.assert('method', 'נא בחרי אמצעי.').isString() // TODO: Validate enum
    return req.validationErrors();
}

async function caclculateDebt (client) {
    const lessons = await Lesson.find({_client: client._id, date: {$lte: new Date()}});
    const debt = lessons.reduce((sum, lesson) => sum + lesson.price, 0);
    client.debt = debt - client.debt;
}

function gravatar(size) {
    if (!size) {
      size = 200;
    }
    if (!this.name) {
      return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash('md5').update(this.name).digest('hex');
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
  };

exports.getClients = async (req, res) => {
    const clients = await Client.aggregate([{
        $addFields: {
            debt: {$sum: '$payments.amount'}
        }
    }]);

    for (let client of clients) {
        await caclculateDebt(client);
        client.gravatar = gravatar
    }
    
    return res.render('client/clients', {
        title: 'לקוחות',
        clients
    });
}

exports.getAddClient = (req, res) => {
    return res.render('client/addClient', {
        title: 'הוסיפי לקוח'
    });
}

/**
 * POST /add-client
 * Create a new client
 * @param {Request} req 
 * @param {Response} res 
 * @param {callback} next 
 */
exports.addClient = async (req, res, next) => {
    const errors = validateClient(req);
    if (errors) {
        req.flash('errors', errors);
        return res.redirect('/add-client')
    }

    const client = new Client({
        name: req.body.name,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        sex: req.body.sex,
        city: req.body.city,
        age: req.body.age,
        tariff: {
            hour: req.body.hourTariff,
            fortyFiveMinutes: req.body.fortyFiveMinutesTariff 
        }
    })

    const existingClient = await Client.findOne({name: req.body.name})
    if (existingClient) {
        req.flash('errors', { msg: 'לקוח עם שם זהה כבר קיים.' });
        return res.redirect('/add-client')
    }

    await client.save()
    req.flash('success', { msg: 'הלקוח נוצר בהצלחה.' });    
    res.redirect(`/clients/${client._id}`);
}

exports.getClient = async (req, res) => {
    const [client] = await Client.aggregate([
        {
            $addFields: {
                debt: {$sum: '$payments.amount'}
            }
        },
        {
            $match: {_id: ObjectId(req.params.id)}
        }
    ])
    await caclculateDebt(client);

    return res.render('client/client', {
        client,
        title: 'לקוח'
    });
}

exports.updateClient = async (req, res, next) => {
    const errors = validateClient(req);
    if (errors) {
        req.flash('errors', errors);
        return res.redirect(`/clients/${req.params.id}`);
    }
    const client = await Client.findById(req.params.id);
    client.name = req.body.name;
    client.email = req.body.email;
    client.phoneNumber = req.body.phoneNumber;
    client.sex = req.body.sex;
    client.city = req.body.city;
    client.age = req.body.age;
    client.tariff = {
        hour: req.body.hourTariff,
        fortyFiveMinutes: req.body.fortyFiveMinutesTariff
    };

    try {
        await client.save()
        req.flash('success', { msg: 'הלקוח עודכן בהצלחה.' });    
        res.redirect(`/clients/${client._id}`);
    } catch (e) {
        req.flash('errors', { msg: 'לקוח עם שם זהה כבר קיים.' });
        return res.redirect(`/clients/${req.params.id}`);        
    }
}

exports.addPayment = async(req, res, next) => {
    const errors = validatePayment(req);
    if (errors) {
        req.flash('errors', errors);
        return res.redirect(`/clients/${req.params.id}`)
    }

    const client = await Client.findById(req.params.id)
    client.payments.push({
        amount: req.body.amount,
        method: req.body.method,
        date: req.body.date
    });
    await client.save();
    
    req.flash('success', { msg: 'התשלום נוסף בהצלחה.' });
    res.redirect(`/clients/${client._id}`);    
}

exports.updatePayment = async (req, res, next) => {
    const errors = validatePayment(req);
    if (errors) {
        req.flash('errors', errors);
        return res.redirect(`/clients/${req.params.id}`);
    }

    await Client.updateOne({
        _id: req.params.id,
        "payments._id": req.params.id2
    }, {
        $set: {
            "payments.$.date": req.body.date,
            "payments.$.amount": req.body.amount,
            "payments.$.method": req.body.method
        }
    })
    req.flash('success', { msg: 'התשלום עודכן בהצלחה.' });
    res.redirect(`/clients/${req.params.id}`);    
}