const express = require("express");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const flash = require("express-flash");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const moment = require("moment");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const database = require("./config/database");
const systemConfig = require("./config/system");
database.connect();
const routeAdmin = require("./routes/admin/index.route");
const route = require("./routes/client/index.route");
const app = express();
const port = process.env.PORT;
app.set("views", `${__dirname}/views`);
app.set("view engine", "pug");
// SocketIO
const server = http.createServer(app);
const io = new Server(server);
global._io = io;

// Flash
app.use(cookieParser("LHNASDASDAD"));
app.use(session({ cookie: { maxAge: 60000 } }));
app.use(flash());
// End Flash
// TinyMCE
app.use(
  "/tinymce",
  express.static(path.join(__dirname, "node_modules", "tinymce"))
);
// End TinyMCE
app.use(express.static(`${__dirname}/public`));
// override with POST having ?_method=DELETE
app.use(methodOverride("_method"));
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// Variables
app.locals.prefixAdmin = systemConfig.prefixAdmin;
app.locals.moment = moment;
// End Variables
// Routes
routeAdmin(app);
route(app);
app.get("*", (req, res) => {
  res.render("client/pages/errors/404", {
    pageTitle: "404 Not Found",
  });
});
server.listen(port, () => {
  console.log(`App listening on port ${port}`);
});