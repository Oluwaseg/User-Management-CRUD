const express = require('express');
const dotenv = require('dotenv');
const morgan = require('morgan');
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const path = require('path');

const app = express();

dotenv.config({ path: 'config.env' });
const connectDB = require('./database/connection');
connectDB();
const PORT = process.env.PORT || 8080;

// log requests
app.use(morgan('tiny'));
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
// mongodb connection

// parse request to body-parser
app.use(bodyparser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: 'testing',
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 30 * 60 * 1000,
    },
  })
);
if (process.env.NODE_ENV === 'production') {
  sessionOptions.cookie.secure = true; // Enable secure cookie in production
}
app.use(limiter);
app.use(flash());
app.use(cors());
const logSession = (req, res, next) => {
  // console.log("Session Data:", req.session);
  next();
};
app.use(logSession);
// set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
//app.set("views", path.resolve(__dirname, "views/ejs"))

// load assets
app.use(express.static('assets'));
app.use(express.static(path.join(__dirname, 'assets')));
// load routers
app.use('/home', require('./routes/crudRoute'));
app.use('/', require('./routes/authRoute'));

app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
