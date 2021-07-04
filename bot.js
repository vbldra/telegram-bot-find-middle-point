require("dotenv").config();
const axios = require("axios");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);
let locationsData = {};
// let isBotWorking = false;

bot.start((ctx) =>
  ctx.reply(
    "Hi! I will help you and your friends to find where to meet. Send /help to see more."
  )
);
bot.help((ctx) =>
  ctx.reply(
    "Send me /wtf to start. Then send your location. When you finished, send me /find"
  )
);

bot.command("/wtf", (ctx) => {
  locationsData[ctx.update.message.chat.id] = {};
  ctx.reply("Send me your location. When you finished, send me /find");
});
bot.on("location", ({ chat, from, message }) => {
  const chatId = chat.id.toString();
  if (locationsData[chatId]) {
    locationsData[chatId][from.id] = message.location;
  }
});
bot.command("/find", (ctx) => {
  const chatId = ctx.update.message.chat.id.toString();
  if (
    locationsData[chatId] &&
    Object.keys(locationsData[chatId]).length !== 0
  ) {
    (async () => {
      try {
        const response = await axios.post(
          "http://localhost:8080/bot",
          Object.values(locationsData[chatId])
        );
        const coordinates = response.data.coordinates;
        ctx.telegram.sendLocation(
          ctx.update.message.chat.id,
          coordinates.latitude,
          coordinates.longitude
        );
        delete locationsData[chatId];
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
