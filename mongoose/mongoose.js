const mongoose = require("mongoose")
require('dotenv').config();

const mongolinkpass = process.env.MONGODB_URL
const connection = async ()=>{
    await mongoose.connect(mongolinkpass)
}

module.exports= connection