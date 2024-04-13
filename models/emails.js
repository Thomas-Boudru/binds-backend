const mongoose = require('mongoose')

const emailsSchema = mongoose.Schema({
    email: String,
})

const Email = mongoose.model('emails', emailsSchema)

module.exports = Email