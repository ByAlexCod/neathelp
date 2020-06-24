var express = require("express");
var authRouter = require("./auth");
var bookRouter = require("./book");
var cardRouter = require("./card");

var app = express();

app.use("/auth/", authRouter);
app.use("/book/", bookRouter);
app.use("/card/", cardRouter);

module.exports = app;