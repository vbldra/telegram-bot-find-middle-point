import axios from "axios";
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
let locationsData = {};

// START
bot.start(async (ctx) => {
  try {
    const chatType = ctx.update.message.chat.type;
    if (chatType === "private") {
      await ctx.replyWithHTML(
        `Hi, ${
          ctx.message.from.first_name
            ? ctx.message.from.first_name
            : ctx.message.from.username
        }!\nI will help you to find middle point between locations.\n\nPress button <b>🗺Start</b> to collect all the locations\nPress button <b>👀Help</b> to see more.`,
        Markup.inlineKeyboard([
          [
            Markup.button.callback("🗺Start", "btn_start"),
            Markup.button.callback("👀Help", "btn_help"),
          ],
        ])
      );
    } else if (chatType === "group") {
      // ctx.reply(
      //   "Hi!\nI will help you and your friends to find where to meet.\n\n1. Press button <b>🗺Start</b>, or send /wtf to start\n2. Each of you send me location\n3. Press button <b>📍Find middle point</b>, or send /find to calculate center point between you and your friends\n\nPress button <b>👀Help</b> or send /help to see more."
      //   // menu
      // );
    } else {
      ctx.reply("Hi. Please add me to private or group chat");
    }
  } catch (error) {
    console.error(error);
  }
});

// HELP
bot.help((ctx) => {
  // const chatType = ctx.update.message.chat.type;
  // if (chatType === "private") {
  //   ctx.reply(
  //     "1. Send /wtf to start\n2. Send locations\n3. Send /find to calculate middle point\n\nYou can add me to your group channel and I can help you and your friends to find where to meet.\nTo see more you can visit our website (we're working on it...)"
  //   );
  // } else if (chatType === "group") {
  //   ctx.reply(
  //     "1. Send /wtf to start\n2. Each of you send me location. You can update your location, I will take last one from everybody of you\n3. Send /find to calculate center point between you and your friends\n\nYou can start with me private chat and I can help you to find middle point between locations.\nTo see more you can visit our website (we're working on it...)"
  //   );
  // } else {
  //   ctx.reply("Hi. Please add me to private or group chat");
  // }
});

// MAIN FUNCTIONALITY
bot.action("btn_start", async (ctx) => {
  await ctx.answerCbQuery();
  locationsData[ctx.update.callback_query.message.chat.id] = {};
  ctx.reply("Send me your location.");
});

bot.on("location", (ctx) => {
  const chatId = ctx.update.message.chat.id.toString();
  const chatType = ctx.update.message.chat.type;
  const userId = ctx.update.message.from.id;
  if (locationsData[chatId]) {
    if (chatType === "private") {
      !locationsData[chatId][userId]
        ? (locationsData[chatId][userId] = [ctx.update.message.location])
        : locationsData[chatId][userId].push(ctx.update.message.location);
      ctx.reply(
        `Send me next location ${
          locationsData[chatId][userId].length > 1
            ? "or let's find middle point"
            : ""
        }`,
        locationsData[chatId][userId].length > 1 &&
          Markup.inlineKeyboard([
            [
              Markup.button.callback("📍Find middle point", "btn_find"),
              Markup.button.callback("👀Help", "btn_help"),
            ],
          ])
      );
    } else if (chatType === "group") {
      // locationsData[chatId][userId] = ctx.update.message.location; // creating object with coordinates for every user
    } else {
      ctx.reply("Hi. Please add me to a private or a group chat");
    }
  }
});

bot.action("btn_find", async (ctx) => {
  const chatId = ctx.update.callback_query.message.chat.id.toString();
  if (locationsData[chatId] && Object.keys(locationsData[chatId]).length != 0) {
    const chatType = ctx.update.callback_query.message.chat.type;
    const userId = ctx.update.callback_query.message.from.id;
    let dataToSend = []; // creating array for backend
    if (chatType === "private") {
      dataToSend = locationsData[chatId][chatId];
    } else if (chatType === "group") {
      dataToSend = locationsData[chatId][userId];
    } else {
      ctx.reply("Hi. Please add me to a private or a group chat");
    }
    (async () => {
      try {
        const response = await axios.post(
          "https://wir-treffen-freunde.herokuapp.com/bot",
          Object.values(dataToSend)
        );
        console.log(dataToSend);

        const coordinates = response.data.coordinates;
        console.log(coordinates);
        ctx.telegram.sendLocation(
          ctx.update.callback_query.message.chat.id,
          coordinates.latitude,
          coordinates.longitude
        );
        delete locationsData[chatId]; // deleting all previous locations for the chat
      } catch (error) {
        console.error(error);
      }
    })();
  } else {
    ctx
      .reply
      // "Send me /wtf to start. Then send your location. When you finished, send me /find"
      ();
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
