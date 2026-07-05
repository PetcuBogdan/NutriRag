const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const convRoutes = require("./routes/conversation");
const messRoutes = require("./routes/message");
const analysisRoutes = require("./routes/analysis");
const menuRoutes = require("./routes/menu");

const app = express();

app.use(bodyParser.json({ limit: "10mb" }));

app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use("/auth", authRoutes);
app.use("/chat", convRoutes);
app.use("/chat", messRoutes);
app.use("/analyses", analysisRoutes);
app.use("/menus", menuRoutes);

const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    app.listen(8080, () => console.log("MedChatAPI running on port 8080"));
  })
  .catch((err) => console.log(err));
