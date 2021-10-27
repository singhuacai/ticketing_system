const Order = require("../models/order_model");
const moment = require("moment");
const offset_hours = process.env.TIMEZONE_OFFSET || 8;

const getPerformanceAndAreas = async (req, res) => {
  const { concertId, concertDateId } = req.query;

  // 給定 concertDateId => 確認確實有此場演唱會
  let result = await Order.checkConcertByConcertDateId(concertDateId);
  if (result[0].count === 0) {
    res.status(400).send({ error: "Bad request!" });
    return;
  }

  // 給定 concertDateId => 搜尋 concert_info
  result = await Order.getConcertTitleAndAreaImage(concertDateId);

  if (!result[0]) {
    res.status(400).send({ error: "Error request!" });
    return;
  }
  result.map((v) => {
    v.concert_area_image = `/${concertId}/${v.concert_area_image}`;
    v.concert_datetime = moment(v.concert_datetime)
      .add(offset_hours, "hours")
      .format("YYYY-MM-DD HH:mm:ss");
    return v;
  });

  // 給定 concertDateId => 查詢 Area 與 ticket prices
  areaAndTicketPrices = await Order.getAreasAndTicketPrices(concertDateId);
  res.status(200).send({
    concert_title: result[0].concert_title,
    concert_location: result[0].concert_location,
    concert_area_image: result[0].concert_area_image,
    concert_datetime: result[0].concert_datetime,
    area_and_ticket_prices: areaAndTicketPrices,
  });
};

const getSeatStatus = async (req, res) => {
  const { concertAreaPriceId } = req.query;
  const userId = req.user.id;

  // 給定 concertAreaPriceId => 確認確實有此場演唱會
  let result = await Order.checkConcertByConcertAreaPriceId(
    concertAreaPriceId,
    userId
  );
  if (result[0].count === 0) {
    res.status(400).send({ error: "Bad request!" });
    return;
  }

  // 給定 concertAreaPriceId => 查詢此區域的座位狀態
  const data = await Order.getSeatStatus(concertAreaPriceId);

  // 若是你選擇的，則修改狀態為 "you-selected"
  data.map((v) => {
    if (v.status === "selected" && v.user_id === userId) {
      v.status = "you-selected";
    }
    if (v.status === "cart" && v.user_id === userId) {
      v.status = "you-cart";
    }
    if (v.status === "sold" && v.user_id === userId) {
      v.status = "you-sold";
    }
    return v;
  });

  // 利用 concertAreaPriceId => 找到 concertDateId  => 找出該使用者購買及加入購物車的總數
  result = await Order.getSoldandCartCount(concertAreaPriceId, userId);

  console.log(result);

  console.log(result[0].count);
  const countOfCartAndSold = result[0].count;

  res.status(200).send({ countOfCartAndSold, data });
};

const getChosenConcertInfo = async (req, res) => {
  const { concertAreaPriceId } = req.query;

  // 給定 concertAreaPriceId => 確認確實有此場演唱會
  let result = await Order.checkConcertByConcertAreaPriceId(concertAreaPriceId);
  if (result[0].count === 0) {
    res.status(400).send({ error: "Bad request!" });
    return;
  }

  // 給定 concertAreaPriceId => 查詢此區域的座位狀態
  const data = await Order.getChosenConcertInfo(concertAreaPriceId);

  data.map((v) => {
    v.concert_datetime = moment(v.concert_datetime)
      .add(offset_hours, "hours")
      .format("YYYY-MM-DD HH:mm:ss");
    return v;
  });

  res.status(200).send({ data });
};

const chooseOrDeleteSeat = async (req, res) => {
  const { seatStatus, concertSeatId } = req.body;
  const userId = req.user.id;

  if (!concertSeatId) {
    res
      .status(400)
      .send({ error: "Request Error: concertSeatId is required." });
    return;
  }

  if (seatStatus !== 0 && seatStatus !== 1) {
    res.status(400).send({ error: "Request Error: seatStatus is error." });
    return;
  }

  let result;
  if (seatStatus === 1) {
    result = await Order.chooseSeat(concertSeatId, userId);
  } else if (seatStatus === 0) {
    result = await Order.deleteSeat(concertSeatId, userId);
  }
  if (result.error) {
    res.status(403).send({ error: result.error });
    return;
  } else {
    res.status(200).send(result);
    return;
  }
};

const rollBackChoose = async (req, res) => {
  const { rollBackSeat } = req.body;
  console.log(rollBackSeat);
  const userId = req.user.id;

  if (!rollBackSeat) {
    res.status(400).send({ error: "Request Error: rollBackSeat is required." });
    return;
  }
  // 利用 rollBackSeat function
  // 1. 查詢該座位目前的狀態是否為 selected 以及是否為同一個使用者
  // 2. 若是同一個使用者，再把座位狀態還原為not-selected狀態!
  result = await Order.rollBackChoose(rollBackSeat, userId);

  // res.status(200).send(result);
  if (result.error) {
    res.status(403).send({ error: result.error });
    return;
  } else {
    res.status(200).send(result);
    return;
  }
};

module.exports = {
  getPerformanceAndAreas,
  getSeatStatus,
  getChosenConcertInfo,
  chooseOrDeleteSeat,
  rollBackChoose,
};
