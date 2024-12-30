// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const path = require("path");
const dotenv = require("dotenv");
const restify = require("restify");
const { BotFrameworkAdapter } = require("botbuilder");
const { DentaBot } = require("./bot");

// Load environment variables
const ENV_FILE = path.join(__dirname, ".env");
const result = dotenv.config({ path: ENV_FILE });
if (result.error) {
  console.error("Error loading .env file", result.error);
  process.exit(1);
}

// Create HTTP server
const server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, () => {
  console.log(`\n${server.name} listening to ${server.url}`);
  console.log(
    "\nGet Bot Framework Emulator: https://aka.ms/botframework-emulator"
  );
  console.log('\nTo talk to your bot, open the emulator and select "Open Bot"');
});

// Create adapter
const adapter = new BotFrameworkAdapter({
  appId: process.env.MicrosoftAppId || "",
  appPassword: process.env.MicrosoftAppPassword || "",
});

// Catch-all for errors
const onTurnErrorHandler = async (context, error) => {
  console.error(`[onTurnError] unhandled error: ${error.message || error}`);
  console.error(error.stack);
  console.info(
    `[onTurnError] activity: ${JSON.stringify(context.activity, null, 2)}`
  );

  await context.sendActivity("Oops! Something went wrong.");
};

// Set the onTurnError for the adapter
adapter.onTurnError = onTurnErrorHandler;

// QnA Maker configuration
const QnAConfiguration = {
  knowledgeBaseId: process.env.QnAKnowledgebaseId || "",
  endpointKey: process.env.QnAAuthKey || "",
  host: process.env.QnAEndpointHostName || "",
};

// LUIS configuration
const LuisConfiguration = {
  applicationId: process.env.LuisAppId || "",
  endpointKey: process.env.LuisAPIKey || "",
  endpoint: process.env.LuisEndpointHostName || "",
};

// Create bot
const myBot = new DentaBot({ QnAConfiguration, LuisConfiguration });

// Listen for incoming requests
server.post("/api/messages", async (req, res) => {
  await adapter.processActivity(req, res, async (context) => {
    await myBot.run(context);
  });
});

// Listen for upgrade requests for streaming
server.on("upgrade", (req, socket, head) => {
  const streamingAdapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId || "",
    appPassword: process.env.MicrosoftAppPassword || "",
  });

  streamingAdapter.onTurnError = onTurnErrorHandler;

  streamingAdapter.useWebSocket(req, socket, head, async (context) => {
    await myBot.run(context);
  });
});
