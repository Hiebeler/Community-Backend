import 'reflect-metadata';
import { errorHandlerMiddleware } from './middleware/errorHandler';
const express = require('express');
const cors = require('cors');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('../swagger-output.json');

app.use(cors());
app.use(express.json());

const authRoute = require('./routes/auth.route');
app.use('/auth', authRoute);

const userRoute = require('./routes/user.route');
app.use('/user', userRoute);

const communityRoute = require('./routes/community.route');
app.use('/community', communityRoute);

const calendarRoute = require('./routes/calendarRoute');
app.use('/calendar', calendarRoute);

const shoppinglistRoute = require('./routes/shoppinglist.route');
app.use('/shoppinglist', shoppinglistRoute);

const debtRoute = require('./routes/debt.route');
app.use('/debt', debtRoute);

app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.use(errorHandlerMiddleware);

app.listen(3000, () => {
  console.log('App listening on Port 3000');
});
