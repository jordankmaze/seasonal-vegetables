const Alexa = require('ask-sdk');
const db = require('./helpers/db');
const GENERAL_REPROMPT = "What would you like to do?";
const dynamoDBTableName = "seasonalVegetables";

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speechText = `Welcome to Seasonal Vegetables, Say something like 'What is in season now' or 'What is in season in summer',
        to hear what will be in season for that time period. Or ask 'When will apples be in season' to find out the best time to buy.`
        const repromptText = 'What would you like to do? You can say HELP to get available options';

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard("Seasonal Vegetables", speechText)
            .reprompt(repromptText)
            .getResponse();
    },
};

const GetCurrentIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'GetCurrentIntent';
    },
    async handle(handlerInput) {
        const { responseBuilder } = handlerInput;
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        let monthSlotValue = slots.month.value;
        let seasonSlotValue = slots.season.value;
        let typeToQuery = slots.fruitorvegetable.value;
        if (typeToQuery !== undefined) {
            typeToQuery = slots.fruitorvegetable.resolutions.resolutionsPerAuthority[0].values[0].value.name;
        }
        return db.getCurrent(monthSlotValue,typeToQuery,seasonSlotValue)
            .then((data) => {
                let speechText = "In season are ";
                if (data.length == 0) {
                    speechText = "I can't find anything. Try again"
                } else {
                    let listToRead = getTenThingsFromList(data);
                    console.log(listToRead);
                    speechText += data.map(e => {
                        return  `${e.userId} `
                    }).join(", ")
                }

                return responseBuilder
                    .speak(speechText)
                    .withSimpleCard("Seasonal Vegetables", speechText)
                    .reprompt(GENERAL_REPROMPT)
                    .getResponse();
            })
            .catch((err) => {
                console.error("Unable to get current. Error JSON:", JSON.stringify(err, null, 2));
                const speechText = "We cannot get anything right now. Try again!"
                return responseBuilder
                    .speak(speechText)
                    .getResponse();
            })
    }
};

// Get say only 10 things at a time
const getTenThingsFromList = (data) => {
    let fullList = data;
    let size = 10;
    let listOfVeg = data.slice(0, size).map(i => {
        return  `${i.userId}`
    }).join(", ")

    return listOfVeg;
};

//Say how many things are in the list first

//Add in some visuals to make the app more fun

const GetByNameSeasonIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'GetByNameSeasonIntent';
    },
    async handle(handlerInput) {
        const { responseBuilder } = handlerInput;
        const slots = handlerInput.requestEnvelope.request.intent.slots;
        let name = slots.vegetableName.value;
        return db.getByNameSeason(name)
            .then((data) => {
                let speechText =  name + " are in season during ";
                if (data.length == 0) {
                    speechText = "I'm sorry, I don't know when that is in season yet."
                } else {
                    speechText += data.map(e => {
                        return  `${e.season} `
                    }).join(", ")
                }

                return responseBuilder
                    .speak(speechText)
                    .withSimpleCard("Seasonal Vegetables", speechText)
                    .reprompt(GENERAL_REPROMPT)
                    .getResponse();
            })
            .catch((err) => {
                console.error("Unable to get current. Error JSON:", JSON.stringify(err, null, 2));
                const speechText = "We cannot get anything right now. Try again!"
                return responseBuilder
                    .speak(speechText)
                    .getResponse();
            })
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = `You can ask what is in season now, what is in season in a specific time of year, or specify a fruit or vegetable and find out when they are in season`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard("Seasonal Vegetables", speechText)
            .reprompt(speechText)
            .getResponse();
    },
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest' &&
            (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent' ||
                handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speechText = 'Goodbye!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    },
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

        return handlerInput.responseBuilder
            .getResponse();
    },
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`Error handled: ${error.message}`);
        const speechText = 'Sorry, I didn\'t understand the command. Please say again.'

        return handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard("Seasonal Vegetables", speechText)
            .reprompt(speechText)
            .getResponse();
    },
};

const skillBuilder = Alexa.SkillBuilders.standard();

exports.handler = skillBuilder
    .addRequestHandlers(
        LaunchRequestHandler,
        GetByNameSeasonIntentHandler,
        GetCurrentIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler
    )
    .addErrorHandlers(ErrorHandler)
    .withTableName(dynamoDBTableName)
    .withAutoCreateTable(true)
    .lambda();