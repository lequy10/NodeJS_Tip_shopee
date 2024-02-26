
require('dotenv').config()
const compression = require('compression')
const express = require('express')
const { default: helmet } = require('helmet')
const morgan = require('morgan')
const app = express()

//middleware
app.use(morgan("combined"))
app.use(helmet())
app.use(compression())


//init db
require('./dbs/init.mongodb')
const { checkOverload} = require('./helpers/check.connect')
// checkOverload()
//init routes
app.get('/', (req, res, next) => {
    const strCom = 'Hello Ralph'
    return res.status(200).json({
        message: 'Hello World!',
        metadata: strCom.repeat(10000)
    })
})

module.exports = app