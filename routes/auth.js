const express = require("express");
const router = express.Router();
const { login, my, getList, getTransaction, placeBet, getMatch, getUserMatch} = require("../controllers/login.controller");
const apicache = require("apicache");
let cache = apicache.middleware;
const path = require("path");
const helmet = require('helmet')
const rateLimit = require('express-rate-limit');

router.use(helmet())

router.post("/login", login);

router.post("/placebet", placeBet);
router.post("/getList",getList)


router.get("/my",rateLimit({
  max: 13,
  windowMs: 5000
}), my);

router.get("/matches",rateLimit({
  max: 13,
  windowMs: 5000
}), getMatch);

router.get("/usermatches",rateLimit({
  max: 13,
  windowMs: 5000
}), getUserMatch);



router.get("/transaction",rateLimit({
  max: 13,
  windowMs: 5000
}), getTransaction);


module.exports = router;
