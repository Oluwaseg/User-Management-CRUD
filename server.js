const express = require("express");
const dotenv = require("dotenv");
const morgan = require("morgan");
const bodyparser = require("body-parser");
const cookieParser = require("cookie-parser");

const path = require("path");

const connectDB = require("./database/connection");

const app = express();

dotenv.config({ path: "config.env" });
const PORT = process.env.PORT || 8080;

// log requests
app.use(morgan("tiny"));

// mongodb connection
connectDB();

// parse request to body-parser
app.use(bodyparser.urlencoded({ extended: true }));
app.use(cookieParser());

// set view engine
app.set("view engine", "ejs");
//app.set("views", path.resolve(__dirname, "views/ejs"))

// load assets
app.use(express.static("assets"));
// load routers
app.use("/", require("./routes/router"));
app.use("/user", require("./routes/auth"));
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
