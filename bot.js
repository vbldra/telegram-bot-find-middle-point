require("dotenv").config();
const axios = require("axios");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);
let locationsData = {};

// START
bot.start((ctx) => {
  const chatType = ctx.update.message.chat.type;
  if (chatType === "private") {
    ctx.reply(
      "Hi!\nI will help you to find middle point between locations.\n\n1. Send /wtf to start\n2. Send locations\n3. Send /find to calculate middle point\n\nSend /help to see more."
    );
  } else if (chatType === "group") {
    ctx.reply(
      "Hi!\nI will help you and your friends to find where to meet.\n\n1. Send /wtf to start\n2. Each of you send me location\n3. Send /find to calculate center point between you and your friends\n\nSend /help to see more."
    );
  } else {
    ctx.reply("Hi. Please add me to private or group chat");
  }
});

// HELP
bot.help((ctx) => {
  const chatType = ctx.update.message.chat.type;
  if (chatType === "private") {
    ctx.reply(
      "1. Send /wtf to start\n2. Send locations\n3. Send /find to calculate middle point\n\nYou can add me to your group channel and I can help you and your friends to find where to meet.\nTo see more you can visit our website (we're working on it...)"
    );
  } else if (chatType === "group") {
    ctx.reply(
      "1. Send /wtf to start\n2. Each of you send me location. You can update your location, I will take last one from everybody of you\n3. Send /find to calculate center point between you and your friends\n\nYou can start with me private chat and I can help you to find middle point between locations.\nTo see more you can visit our website (we're working on it...)"
    );
  } else {
    ctx.reply("Hi. Please add me to private or group chat");
  }
});

// MAIN FUNCTIONALITY
bot.command("/wtf", (ctx) => {
  locationsData[ctx.update.message.chat.id] = {};
  ctx.reply("Send me your location.\nWhen you finished, send me /find");
});

bot.on("location", (ctx) => {
  const chatId = ctx.update.message.chat.id.toString();
  const chatType = ctx.update.message.chat.type;
  const userId = ctx.update.message.from.id;

  if (locationsData[chatId]) {
    if (chatType === "private") {
      !locationsData[chatId][userId] // creating array with coordinates for one person
        ? (locationsData[chatId][userId] = [ctx.update.message.location])
        : locationsData[chatId][userId].push(ctx.update.message.location);
    } else if (chatType === "group") {
      locationsData[chatId][userId] = ctx.update.message.location; // creating object with coordinates for every user
    } else {
      ctx.reply("Hi. Please add me to private or group chat");
    }
  }
});
bot.command("/find", (ctx) => {
  const chatId = ctx.update.message.chat.id.toString();
  if (
    locationsData[chatId] &&
    Object.keys(locationsData[chatId]).length !== 0
  ) {
    const chatType = ctx.update.message.chat.type;
    const userId = ctx.update.message.from.id;
    let dataToSend = []; // creating array for backend

    if (chatType === "private") {
      dataToSend = locationsData[chatId][userId];
    } else if (chatType === "group") {
      dataToSend = locationsData[chatId];
    } else {
      ctx.reply("Hi. Please add me to private or group chat");
    }

    (async () => {
      try {
        const response = await axios.post(
          "http://localhost:8080/bot",
          Object.values(dataToSend)
        );
        const coordinates = response.data.coordinates;
        ctx.telegram.sendLocation(
          ctx.update.message.chat.id,
          coordinates.latitude,
          coordinates.longitude
        );
        delete locationsData[chatId]; // deleting all previous locations for the chat
      } catch (error) {
        console.log(error);
      }
    })();
  } else {
    ctx.reply(
      "Send me /wtf to start. Then send your location. When you finished, send me /find"
    );
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
