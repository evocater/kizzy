/* require('dotenv').config */
const jwt = require("jsonwebtoken");
const { PrismaClient, Prisma } = require(`@prisma/client`);
const prisma = new PrismaClient();
const Joi = require("joi");

function isValidTime(time) {
  time = new Date(time);
  const now = new Date();

  const msBetweenDates = Math.abs(time.getTime() - now.getTime());

  // convert ms to hours                  min  sec   ms
  const hoursBetweenDates = msBetweenDates / (60 * 60 * 1000);

  if (hoursBetweenDates < 24) {
    return true;
  } else {
    return false;
  }
}

async function postChannelDelete(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    let id = null;
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const channelSchema = Joi.object({
      id: Joi.string().required(),
    });
    const { error } = channelSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;

    await prisma.channel.delete({
      where: { ID: data.id },
    });

    return res.status(200).json({ success: "Channel Deleted Successfully" });
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function postLogDelete(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    let id = null;
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const logSchema = Joi.object({
      id: Joi.number().required(),
      userID: Joi.number().required(),
      oldXp: Joi.number().required(),
    });
    const { error } = logSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;

    await prisma.log.delete({
      where: { ID: data.id },
    });

    await prisma.user.update({
      where: { ID: data.userID },
      data: {
        totalXp: {
          decrement: data.oldXp,
        },
      },
    });

    return res.status(200).json({ success: "Log Deleted Successfully" });
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function checkAdmin(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    let id = null;
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const admin = await prisma.admin.findUnique({
      where: { ID: id },
    });

    if (admin == null || admin?.status == "inactive") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    return res.status(200).json({ success: "Login successfully" });
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getAllLogs(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const logs = await prisma.log.findMany({
      include: {
        user: {
          select: {
            matricaID: true,
            twitter: true,
            discord: true,
          },
        },
      },
      orderBy: {
        ID: "desc",
      },
    });

    if (logs) {
      return res.status(200).json(logs);
    }
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function postLogs(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const logSchema = Joi.object({
      id: Joi.number().required(),
      type: Joi.string().required(),
      xp: Joi.number().required(),
      element: Joi.string().allow(""),
    });
    const { error } = logSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;

    const log = await prisma.log.create({
      data: {
        userID: data.id,
        type: data.type,
        xp: data.xp,
        elementID: data?.element,
      },
    });

    if (log) {
      await prisma.user.update({
        where: { ID: data.id },
        data: {
          totalXp: {
            increment: data.xp,
          },
        },
      });
      return res.status(200).json({ status: "success" });
    }
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function postLogsUpdate(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const logSchema = Joi.object({
      id: Joi.number().required(),
      oldXp: Joi.number().required(),
      type: Joi.string().required(),
      xp: Joi.number().required(),
      element: Joi.string().allow(""),
    });
    const { error } = logSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;

    const log = await prisma.log.update({
      where: { ID: data.id },
      data: {
        type: data.type,
        xp: Number(data.xp),
        elementID: data?.element,
      },
    });

    if (log) {
      await prisma.user.update({
        where: { ID: log.userID },
        data: {
          totalXp: {
            decrement: Number(data.oldXp),
          },
        },
      });
      await prisma.user.update({
        where: { ID: log.userID },
        data: {
          totalXp: {
            increment: Number(data.xp),
          },
        },
      });

      return res.status(200).json({ status: "success" });
    }
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getAdminData(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const adminSchema = Joi.object({
      id: Joi.number().required(),
    });
    const { error } = adminSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;

    const admin = await prisma.admin.findUnique({
      where: { ID: data.id },
    });

    if (admin) {
      return res.status(200).json(admin);
    }
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getAdmin(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const admin = await prisma.admin.findMany({
      orderBy: {
        ID: "desc",
      },
    });

    return res.status(200).json(admin);
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function postLimits(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const limitSchema = Joi.object({
      id: Joi.number().required(),
      xp: Joi.number().required(),
      xp2: Joi.number().required(),
      max: Joi.number().required(),
    });
    const { error } = limitSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;

    const limit = await prisma.limit.update({
      where: { ID: data.id },
      data: {
        xp: Number(data?.xp),
        xp2: Number(data?.xp2),
        max: Number(data?.max),
      },
    });

    if (limit) {
      return res.status(200).json({ status: "success" });
    }
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function postNewChannel(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const channelSchema = Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      type: Joi.string().required(),
      status: Joi.string().required(),
      duration: Joi.number(),
      start: Joi.number(),
      end:Joi.number()
    });
    const { error } = channelSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;
    let type = true;
    let enabled = true;
    let channel;

    if (data.type !== "reaction") {
      type = false;
    }

    if (data.status !== "active") {
      enabled = false;
    }

    if(data.type !== 'voice'){


      channel = await prisma.channel.upsert({
        where: { ID: data.id },
        create: {
          ID: data.id,
          name: data.name,
          enabled: enabled,
          announcement: type,
        },
        update: { name: data.name, enabled: enabled, announcement: type },
      });



    }else{
      
    channel = await prisma.channel.upsert({
      where: { ID: data.id },
      create: {
        ID: data.id,
        name: data.name,
        enabled: enabled,
        announcement: type,
        voice: true,
        startTime:String(data.start),
        endTime:String(data.end),
        duration: Number(data.duration)
      },
      update: { name: data.name, enabled: enabled, announcement: type,voice: true,
        startTime:String(data.start),
        endTime:String(data.end),
        duration: Number(data.duration) },
    });
    }


    if (channel) {
      return res.status(200).json({ status: "success" });
    }
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function postNewAdmin(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const adminSchema = Joi.object({
      name: Joi.string().required(),
      wallet: Joi.string().required(),
      status: Joi.string().required(),
      role: Joi.string().required(),
    });
    const { error } = adminSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;

    const admin = await prisma.admin.create({
      data: {
        name: data.name,
        role: data.role,
        status: data.status,
        wallet: data.wallet,
      },
    });

    if (admin) {
      return res.status(200).json({ status: "success" });
    }
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function postAdmin(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const adminSchema = Joi.object({
      id: Joi.number().required(),
      name: Joi.string().required(),
      wallet: Joi.string().required(),
      status: Joi.string().required(),
      role: Joi.string().required(),
    });
    const { error } = adminSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;

    const admin = await prisma.admin.update({
      where: { ID: data.id },
      data: {
        name: data.name,
        role: data.role,
        status: data.status,
        wallet: data.wallet,
      },
    });

    if (admin) {
      return res.status(200).json({ status: "success" });
    }
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getLeaderboard(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");
    jwt.verify(token, process.env.JWT_SECRET, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      }
    });

    const items =
      await prisma.$queryRaw`SELECT  u."totalXp", u."createdAt", u."matrica_id", u."ID", t."name" AS "twitter_name", d."name" AS "discord_name", CAST(RANK() OVER (ORDER BY u."totalXp" DESC) AS INTEGER) Rank
      FROM public."User" u
      LEFT JOIN public."Discord" d ON u."discordID" = d."ID"
      LEFT JOIN public."Twitter" t ON u."twitterID" = t."ID"`;

    if (items) {
      return res.status(200).json(items);
    }
  } catch (error) {
    console.log(error);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getDashboard(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");
    jwt.verify(token, process.env.JWT_SECRET, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      }
    });

    let data = [];
    const items =
      await prisma.$queryRaw`SELECT  u."totalXp",t."name" AS "twitter_name", d."name" AS "discord_name", t."pfp" AS "twitter_pfp", t."url" AS "twitter_url", CAST(RANK() OVER (ORDER BY u."totalXp" DESC) AS INTEGER) Rank
      FROM public."User" u
      LEFT JOIN public."Discord" d ON u."discordID" = d."ID"
      LEFT JOIN public."Twitter" t ON u."twitterID" = t."ID"
      LIMIT 20;`;

    const user = await prisma.user.findMany({
      select: {
        twitter: {
          select: {
            name: true,
          },
        },
        discord: {
          select: {
            name: true,
          },
        },
        matricaID: true,
      },
      orderBy: {
        ID: "desc",
      },
      take: 100,
    });

    let count = [];
    const userCount = await prisma.user.count();
    const walletCount = await prisma.wallet.count();
    const pfpCount = await prisma.twitter.count({
      where:{pfp:true}
    })

    const sum = await prisma.$queryRaw`SELECT CAST(SUM("totalXp") AS INTEGER)
    FROM public."User"`;

    const tweets = await prisma.tweet.findMany();
    const channels = await prisma.channel.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    let validtweets = [];
    if (tweets) {
      for (let tweet1 of tweets) {
        if (isValidTime(tweet1.date)) {
          validtweets.push(tweet1);
        }
      }
    }

    const graph =
      await prisma.$queryRaw`SELECT TO_CHAR(DATE_TRUNC('month', "createdAt"), 'Mon') AS month_year,
      COALESCE(CAST(SUM("xp") AS INTEGER), 0) as total_xp
      FROM "Log"
      WHERE "createdAt" >= NOW() - INTERVAL '5 months'
      GROUP BY month_year, EXTRACT(YEAR FROM "createdAt"), EXTRACT(MONTH FROM "createdAt")
      ORDER BY EXTRACT(YEAR FROM "createdAt") DESC, EXTRACT(MONTH FROM "createdAt") ASC;`

    data.push({
      leaderboard: items,
      user: user,
      tweets: validtweets,
      channels: channels,
      graph: graph,
      data: {
        userCount: userCount,
        pfpCount: pfpCount,
        xpCount: sum[0].sum,
        walletCount: walletCount,
      },
    });

    return res.status(200).json(data);
  } catch (error) {
    console.log;
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getXpSettings(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");
    jwt.verify(token, process.env.JWT_SECRET, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      }
    });

    const xp = await prisma.limit.findMany({
      orderBy: {
        ID: "asc",
      },
    });

    return res.status(200).json(xp);
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getXpData(req, res) {
  try {
    const xps = await prisma.limit.findUnique({
      where: { ID: req.body.id },
    });

    if (xps) {
      return res.status(200).json(xps);
    }
  } catch (err) {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getChannelData(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const channelSchema = Joi.object({
      id: Joi.string().required(),
    });
    const { error } = channelSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;

    const channel = await prisma.channel.findUnique({
      where: { ID: data.id },
    });

    if (channel) {
      return res.status(200).json(channel);
    }
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getUserData(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const userSchema = Joi.object({
      id: Joi.number().required(),
    });
    const { error } = userSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let currentDate = new Date();
    let endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);

    const sum = await prisma.log.groupBy({
      by: ["userID"],
      where: {
        userID: req.body.id,
        createdAt: {
          gte: new Date(currentDate.toISOString().split("T")[0]),
          lt: new Date(endDate.toISOString().split("T")[0]),
        },
      },
      _sum: {
        xp: true,
      },
    });

    const users = await prisma.user.findUnique({
      where: { ID: req.body.id },
      include: {
        logs: {
          orderBy: {
            ID: "desc",
          },
        },
        twitter: true,
        discord: true,
        wallets: true,
      },
    });

    if (users) {
      if (sum.length > 0) {
        users.sum = sum[0]._sum.xp;
      }

      return res.status(200).json(users);
    }
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getLogData(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const logSchema = Joi.object({
      id: Joi.number().required(),
    });
    const { error } = logSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    const log = await prisma.log.findUnique({
      where: { ID: req.body.id },
      include: {
        user: {
          select: {
            ID: true,
            matricaID: true,
            twitter: true,
            discord: true,
          },
        },
      },
    });

    if (log) {
      return res.status(200).json(log);
    }
  } catch (err) {
    console.log(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function getUsers(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");
    jwt.verify(token, process.env.JWT_SECRET, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      }
    });

    const users = await prisma.user.findMany({
      select: {
        ID: true,
        matricaID: true,
        totalXp: true,
        multiplier: true,
        createdAt: true,
        gen2:true,
        gen3:true,
        boostID:true,
        twitter: {
          select: {
            name: true,
            pfp: true,
            days: true,
          },
        },
        discord: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        ID: "desc",
      },
    });

    return res.status(200).json(users);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}

async function adminLogin(req, res) {
  try {
    const adminSchema = Joi.object({
      public: Joi.string().required(),
    });
    const { error } = adminSchema.validate(req.body, { abortEarly: true });

    if (error) {
      return res.status(500).json({ error: "Invalid Login Request" });
    }

    let data = req.body;
    let user = null;

    user = await prisma.admin.findUnique({
      where: { wallet: data.public },
    });

    if (user == null || user?.status == "inactive") {
      return res.status(401).json({ error: "Invalid Login Request" });
    } else {
      return res.status(200).json({
        token: jwt.sign({ ID: user.ID }, process.env.JWT_SECRET, {
          expiresIn: "30d",
        }),
        name: user.name,
        role: user.role,
      });
    }
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}





async function getTracked(req, res) {
  try {
    let token = req.headers["authorization"];

    if (!token) {
      return res.status(500).json({ error: "Please provide valid token!" });
    }

    token = token.replace(/^Bearer\s+/, "");
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Token is not valid",
        });
      } else {
        id = decoded.ID;
      }
    });

    const tweets = await prisma.tweet.findMany({
      orderBy: {
        ID: "desc",
      },
    });
    const channels = await prisma.channel.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    let validtweets = [];
    let limittweets = [];
    let data = [];
    if (tweets) {
      for (let tweet1 of tweets) {
        if (isValidTime(tweet1.date)) {
          validtweets.push(tweet1);
        } else {
          limittweets.push(tweet1);
        }
      }
    }

    const expiredtweets = limittweets.slice(0, 8);

    //Twitter Retweet Like
    let twitterRL = [];
    let twitterPFP = [];

    for (let i = 1; i < 25; i++) {
      let moment = new Date(new Date().setHours(0, 0, 0, 0)) / 1000 + i * 3600;
      twitterRL.push(moment);
    }
    const date = twitterRL.filter((e) => {
      return e > Date.now() / 1000;
    });

    for (let i = 1; i < 25; i++) {
      let moment = new Date(new Date().setHours(0, 0, 0, 0)) / 1000 + i * 3600;
      twitterPFP.push(moment);
    }
    const date1 = twitterPFP.filter((e) => {
      return e > Date.now() / 1000;
    });

    data.push({
      tweets: validtweets,
      expired: expiredtweets,
      channels: channels,
      twitterRLScan: date[0],
      twitterPFPScan: date1[0],
      bonusScan: new Date(new Date().setHours(23, 35, 0, 0)) / 1000,
    });

    return res.status(200).json(data);
  } catch (error) {
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Internal server error' });
    }

  }
}



module.exports = {
  adminLogin,
  getUsers,
  getXpSettings,
  getDashboard,
  getUserData,
  getXpData,
  getTracked,
  getAllLogs,
  getChannelData,
  postLogs,
  postLogsUpdate,
  postLimits,
  postAdmin,
  postLogDelete,
  postNewAdmin,
  postNewChannel,
  postChannelDelete,
  getLeaderboard,
  getAdmin,
  getLogData,
  getAdminData,
  checkAdmin,
};
