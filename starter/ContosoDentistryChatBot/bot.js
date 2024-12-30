const { ActivityHandler } = require("botbuilder");
const { LuisRecognizer, QnAMaker } = require("botbuilder-ai");

class DentaBot extends ActivityHandler {
  constructor(configuration) {
    super();

    // Initialize QnA Maker with the correct configuration
    this.qnaMaker = new QnAMaker({
      knowledgeBaseId: process.env.QnAKnowledgebaseId || "",
      endpointKey: process.env.QnAAuthKey || "",
      host: process.env.QnAEndpointHostName || "",
      deploymentName: process.env.QnADeploymentName || "",
    });

    console.log("QnA Maker initialized:", this.qnaMaker);

    // Initialize LUIS Recognizer
    this.luisRecognizer = new LuisRecognizer(
      {
        applicationId: process.env.LuisAppId || "",
        endpointKey: process.env.LuisAPIKey || "",
        endpoint: process.env.LuisEndpointHostName || "",
      },
      {
        apiVersion: "v3",
        includeAllIntents: true,
        includeInstanceData: true,
        log: true, // Enable logging
      }
    );

    console.log("LUIS Recognizer initialized:", this.luisRecognizer);

    // Send welcome message to new users
    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      const welcomeText =
        "Hello! I am your dental assistant. How can I help you today?";
      for (let member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(welcomeText);
        }
      }
      await next();
    });

    // Handle message activity
    this.onMessage(async (context, next) => {
      const message = context.activity.text;
      console.log(`Received message: ${message}`);

      // Process the message with LUIS
      const luisResult = await this.luisRecognizer.recognize(context);
      console.log("LUIS result:", luisResult);

      // Process the message with QnA Maker
      const qnaResults = await this.qnaMaker.getAnswers(context);
      if (qnaResults.length > 0) {
        await context.sendActivity(qnaResults[0].answer);
      } else {
        await context.sendActivity(
          "I'm sorry, I do not have an answer for that."
        );
      }

      await next();
    });
  }
}

module.exports.DentaBot = DentaBot;
