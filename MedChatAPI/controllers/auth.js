const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const User = require("../models/user");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

exports.signup = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }
  const email = req.body.email;
  const password = req.body.password;
  const role = req.body.isNutritionist ? 'nutritionist' : 'user';
  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        role: role,
      });
      return user.save();
    })
    .then(() => {
      return User.findOne({ email: email });
    })
    .then((loadedUser) => {
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
          role: loadedUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.status(201).json({
        message: "User created",
        token: token,
        userId: loadedUser._id.toString(),
        role: loadedUser.role,
      });
      return transporter.sendMail({
        from: "bogdan.petcu02@e-uvt.ro",
        to: email,
        subject: "Signup succeeded",
        html: "<h1>You successfully signed up!</h1>",
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('email role');
    if (!user) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      return next(err);
    }
    res.status(200).json({ email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
};

exports.login = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  let loadedUser;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        const error = new Error("A user with this email could not be found.");
        error.statusCode = 401;
        throw error;
      }
      loadedUser = user;
      return bcrypt.compare(password, user.password);
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error("Wrong password!");
        error.statusCode = 401;
        throw error;
      }
      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
          role: loadedUser.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.status(200).json({ token: token, userId: loadedUser._id.toString(), role: loadedUser.role });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};
