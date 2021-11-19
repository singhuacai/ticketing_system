const User = require("../server/models/user_model");
const { TOKEN_SECRET } = process.env; // 30 days by seconds
const jwt = require("jsonwebtoken");

const wrapAsync = (fn) => {
  return function (req, res, next) {
    fn(req, res, next).catch(next);
  };
};

const authentication = (roleId) => {
  return async function (req, res, next) {
    let accessToken = req.get("Authorization");
    if (!accessToken) {
      res.status(401).send({ error: "Unauthorized" });
      return;
    }
    accessToken = accessToken.replace("Bearer ", "");
    if (accessToken === "null") {
      res.status(401).send({ error: "Unauthorized" });
      return;
    }

    try {
      const user = jwt.verify(accessToken, TOKEN_SECRET);
      req.user = user;
      if (roleId === null) {
        next();
      } else {
        let userDetail;
        if (roleId === User.role.ALL) {
          userDetail = await User.getUserDetail(user.email);
        } else {
          userDetail = await User.getUserDetail(user.email, roleId);
        }
        if (!userDetail) {
          return res.status(403).send({ error: "Forbidden" });
        } else {
          req.user.id = userDetail.id;
          req.user.user_code = userDetail.user_code;
          req.user.role_id = userDetail.role_id;
          return next();
        }
      }
      return;
    } catch (err) {
      res.status(403).send({ error: "Forbidden" });
      return;
    }
  };
};

const parseSocketId = () => {
  return async function (req, res, next) {
    req.socketId = req.get("SocketId");
    if (!req.socketId) {
      res.status(401).send({ error: "Require Socket Id" });
      return;
    }
    next();
  };
};

module.exports = {
  wrapAsync,
  authentication,
  parseSocketId,
};
