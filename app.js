const express = require('express')
const app = express();

// Add JSON parsing middleware
app.use(express.json());

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Tennis API',
      version: '1.0.0',
      description:
        'A simple ATP and WTA tennis API',
    },
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(specs)
);

const routes = require('./routes');

app.use("/api", routes);

app.listen(7070, () => {
  console.log('Example app listening on port 7070!');
});