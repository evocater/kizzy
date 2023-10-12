const express = require("express");
const router = express.Router();
const { login, my, getList} = require("../controllers/login.controller");
const apicache = require("apicache");
let cache = apicache.middleware;
const path = require("path");
const helmet = require('helmet')
const rateLimit = require('express-rate-limit');

router.use(helmet())

router.post("/login", login);


router.post("/getList",getList)


router.get("/my",rateLimit({
  max: 13,
  windowMs: 5000
}), my);


module.exports = router;
