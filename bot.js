require("dotenv").config();
const axios = require("axios");
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);
let locationsData = {};
let isBotWorking = false;

bot.start((ctx) => ctx.reply("I will help you to find where to meet"));
bot.help((ctx) =>
  ctx.reply(
    "Send me /wtf to start. Then send your location. When you finished, send me /stop"
  )
);

bot.command("/wtf", (ctx) => {
  isBotWorking = true;
  ctx.reply("Send me your location. When you finished, send me /stop");
});
bot.on("location", ({ from, message }) => {
  if (isBotWorking) {
    locationsData[from.id] = message.location;
  }
});
bot.command("/stop", (ctx) => {
  if (Object.keys(locationsData).length !== 0) {
    (async () => {
      try {
        const response = await axios.post(
          "http://localhost:8080/bot",
          Object.values(locationsData)
        );
        const coordinates = response.data.coordinates;
        ctx.telegram.sendLocation(
          ctx.update.message.chat.id,
          coordinates.latitude,
          coordinates.longitude
        );
        locationsData = {};
      } catch (error) {
        console.log(error);
      }
    })();
  } else {
    ctx.reply(
      "Send me /wtf to start. Then send your location. When you finished, send me /stop"
    );
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
