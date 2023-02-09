import axios from "axios";
import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const backendLink = process.env.BACKEND_LINK;
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
        }!\nI will help you to find middle point between locations.\n\nPress button [ 🗺 Send location ] to collect all the locations\nSend <b>/help</b> to see more.`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🗺 Send location", "btn_start")],
        ])
      );
    } else if (chatType === "group") {
      await ctx.replyWithHTML(
        `Hi, dear ${
          ctx.message.chat.title
            ? ctx.message.chat.title
            : ctx.message.from.username
        } team!\nI will help you and your friends to find where to meet.\n\nPress button [ 🗺 Send location ] to collect all the locations\nSend <b>/help</b> to see more.`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🗺 Send location", "btn_start")],
        ])
      );
    } else {
      ctx.reply("Hi. Please add me to private or group chat");
    }
  } catch (error) {
    console.error(error);
  }
});

// HELP
bot.help((ctx) => {
  const chatType = ctx.update.message.chat.type;
  if (chatType === "private") {
    ctx.replyWithHTML(
      `1. Press button <b>[ 🗺 Send location ]</b>\n2. Send me your locations.\n3. Press button <b>[ 📍 Find middle point ]</b> to calculate the middle point.\n\nYou can add me to your group channel and I can help you and your friends to find where to meet.\nTo see more you can visit our website <a href='https://wir-treffen-freunde.netlify.app/'>Wir Treffen Freunde</a>`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🗺 Send location", "btn_start")],
      ])
    );
  } else if (chatType === "group") {
    ctx.replyWithHTML(
      `1. Press button <b>[ 🗺 Send location ]</b>\n2. Send me the location of everyone who wants to meet. You can correct your location, I will take last coordinates.\n3. Press button <b>[ 📍 Find middle point ]</b> to calculate the middle point between you and your friends.\n\nYou can start with me private chat and I can help you to find middle point between any locations.\nTo see more you can visit our website <a href='https://wir-treffen-freunde.netlify.app/'>Wir Treffen Freunde</a>`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🗺 Send location", "btn_start")],
      ])
    );
  } else {
    ctx.reply("Hi. Please add me to private or group chat");
  }
});

// MAIN FUNCTIONALITY
bot.action("btn_start", async (ctx) => {
  const chatId = ctx.update.callback_query.message.chat.id.toString();
  delete locationsData[chatId]; // deleting all previous locations for the chat
  try {
    await ctx.answerCbQuery();
    locationsData[chatId] = {};
    ctx.reply("Send me your location.");
  } catch (error) {
    console.error(error);
  }
});

bot.on("location", async (ctx) => {
  const chatId = ctx.update.message.chat.id.toString();
  const chatType = ctx.update.message.chat.type;
  const userId = ctx.update.message.from.id;
  try {
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
              [Markup.button.callback("📍 Find middle point", "btn_find")],
            ])
        );
      } else if (chatType === "group") {
        locationsData[chatId][userId] = ctx.update.message.location;
        ctx.reply(
          `Send me next location ${
            Object.keys(locationsData[chatId]).length > 1
              ? "or let's find middle point"
              : ""
          }`,
          Object.keys(locationsData[chatId]).length > 1 &&
            Markup.inlineKeyboard([
              [Markup.button.callback("📍 Find middle point", "btn_find")],
            ])
        );
      } else {
        ctx.reply("Hi. Please add me to a private or a group chat");
      }
    }
  } catch (error) {
    console.error(error);
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
      dataToSend = Object.values(locationsData[chatId]);
    } else {
      ctx.reply("Hi. Please add me to a private or a group chat");
    }
    try {
      const response = await axios.post(
        `${backendLink}`,
        Object.values(dataToSend)
      );
      const coordinates = response.data.coordinates;
      ctx.replyWithHTML("Your middle point is here:");
      await ctx.telegram.sendLocation(
        ctx.update.callback_query.message.chat.id,
        coordinates.latitude,
        coordinates.longitude
      );
      ctx.replyWithHTML(
        `Start again?\n\nPress button [ 🗺 Send location ] to collect all the locations\nSend <b>/help</b> to see more.`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🗺 Send location", "btn_start")],
        ])
      );
    } catch (error) {
      console.error(error);
    }
  } else {
    ctx.replyWithHTML(
      `Press button [ 🗺 Send location ] to collect all the locations\nSend <b>/help</b> to see more.`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🗺 Send location", "btn_start")],
      ])
    );
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));