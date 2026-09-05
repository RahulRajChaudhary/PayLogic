require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRouter = require('./routes/auth');
const companyRouter = require('./routes/company');
const employeesRouter = require('./routes/employees');
const departmentsRouter = require('./routes/departments');
const usersRouter = require('./routes/users');
const tagsRouter = require('./routes/tags');
const attendanceRouter = require('./routes/attendance');
const timeOffRouter = require('./routes/timeOff');
const contractsRouter = require('./routes/contracts');

const app = express();
const port = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.use('/auth', authRouter);
app.use('/company', companyRouter);
app.use('/employees', employeesRouter);
app.use('/departments', departmentsRouter);
app.use('/users', usersRouter);
app.use('/tags', tagsRouter);
app.use('/attendance', attendanceRouter);
app.use('/time-off', timeOffRouter);
app.use('/contracts', contractsRouter);

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
