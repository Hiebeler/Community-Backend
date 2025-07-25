const swaggerAutogen = require('swagger-autogen')()
require('dotenv').config()

const doc = {
  info: {
    title: 'Kommiuniti API',
    description: 'API for Kommiuniti App'
  },
  host: process.env.HOST,
  schemes: ['http', 'https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  securityDefinitions: {
    Bearer: {
      type: 'apiKey',
      name: 'Authorization',
      in: 'header'
    }
  }
}

const outputFile = './swagger-output.json'
const endpointsFiles = ['./src/app.ts']

swaggerAutogen(outputFile, endpointsFiles, doc)
