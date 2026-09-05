require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRouter = require('./routes/auth');
const companyRouter = require('./routes/company');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/company', companyRouter);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
