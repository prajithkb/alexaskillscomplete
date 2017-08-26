'use strict';
var https = require('https');

/** Constant variables ****/

const Alexa = require('alexa-sdk');
const IMAGE_OBJ = {
    smallImageUrl: "https://image.ibb.co/iQ5ESQ/IMG_20170702_WA0004.jpg",
    largeImageUrl: "https://image.ibb.co/iQ5ESQ/IMG_20170702_WA0004.jpg"
};
const APP_ID = "amzn1.ask.skill.1fc839fb-5d90-4318-bc32-5e4dc60d61ed"; // TODO replace with your app ID (OPTIONAL).
const TEXT = {
    text: "Hi"
};

const BUS_NUMBER_ID_MAP = {
    141 : '/StopPoint/490003114S/arrivals',
    341 : '/StopPoint/490003114S/arrivals',
    73 : '/StopPoint/490015396S/arrivals',
    default: '/StopPoint/490003114S/arrivals'
}

/** String helpful methods **/
String.prototype.insert = function(index, string) {
    if (index > 0)
        return this.substring(0, index) + string + this.substring(index, this.length);
    else
        return string + this;
};

String.prototype.replaceAt = function(index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length);
}

/** States of this skill **/
var states = {
    START: '_START',
    END: '_END'
};

const startStateHandlers = Alexa.CreateStateHandler(states.START, {
    "NewSession": function() {
        this.handler.state = states.START;
        this.emitWithState("BusIntent");
    },
    'LaunchRequest': function() {
        this.handler.state = states.START;
        this.emitWithState("BusIntent");
    },
    'BusIntent': function() {
        tfl.call(this, this, function(args) {
            args.templateDirective = templateDirective();
            let argumentz = createArgs(args);
            this.emit.apply(this, argumentz);
        });

    },
    'SessionEndedRequest': function() {
        console.log('session ended!');
        this.emit(':saveState', false);
    }

});

const endStateHandlers = Alexa.CreateStateHandler(states.END, {
    "NewSession": function() {
        this.handler.state = states.START;
        this.emitWithState("BusIntent");
    },
    'BusIntent': function() {
        tfl.call(this, this, function(args) {
            args.templateDirective = templateDirective();
            let argumentz = createArgs(args);
            this.emit.apply(this, argumentz);
        });

    },
    'CompleteListIntent': function() {
        tfl.call(this, this, function(args) {
            this.emit(":tell", args.speak, templateDirective());
        }, speakableTextTransform);
        this.handler.state = states.END;

    },
    'AMAZON.HelpIntent': function() {
        this.handler.state = states.START;
        this.emit(':ask', "Say, Ask Taco when is the next bus", "Was I able to help?");
    },
    'AMAZON.CancelIntent': function() {
        this.emit(':tell', "Sure");
    },
    'AMAZON.StopIntent': function() {
        this.emit(':tell', "Ok");
    },
    "AMAZON.RepeatIntent": function() {
        this.handler.state = states.START;
        this.emitWithState("BusIntent");
    },
    "YesIntent": function() {
        console.log("in the yes Intent")
        this.emitWithState('CompleteListIntent');
    },
    "AMAZON.NoIntent": function() {
        this.emit(":tell", "Ok! have a great bus ride!");
    },
    "Unhandled": function() {
        var speechOutput = "Sorry, I am not sure";
        var reprompt = " Can you please repeat it?";
        this.emit(":ask", speechOutput + "." + reprompt, reprompt);
    },
    'SessionEndedRequest': function() {
        console.log('session ended!');
        this.emit(':saveState', false);
    }

});

var newSessionHandlers = {
    "NewSession": function() {
        this.handler.state = states.START;
        this.emitWithState("BusIntent");
    },
    "LaunchRequest": function() {
        this.handler.state = states.START;
        this.emitWithState("BusIntent");
    },
    'BusIntent': function() {
        this.handler.state = states.START;
        tfl.call(this, this, function(args) {
            args.templateDirective = templateDirective();
            let argumentz = createArgs(args);
            this.emit.apply(this, argumentz);
        });

    },
    "AMAZON.HelpIntent": function() {
        this.handler.state = states.START;
        this.emitWithState("AMAZON.HelpIntent");
    },
    "Unhandled": function() {
        var speechOutput = "Sorry, I am not sure ";
        var reprompt = " Can  please you repeat it?";
        this.emit(":ask", speechOutput + "." + reprompt, reprompt);
    },
    'SessionEndedRequest': function() {
        console.log('session ended!');
        this.emit(':saveState', false);
    }
};

/*** Helper functions *****************************************/
function createArgs(args) {
    let argumentz = [];
    argumentz.push(args.emitType);
    argumentz.push(args.speak);
    if (args.emitType == ":ask")
        argumentz.push(args.reprompt);
    argumentz.push(args.templateDirective);
    return argumentz;
}

function createTemplate() {
    const builder = new Alexa.templateBuilders.BodyTemplate6Builder();
    const makePlainText = Alexa.utils.TextUtils.makePlainText;
    const makeImage = Alexa.utils.ImageUtils.makeImage;
    console.log(TEXT.text);
    let template = builder
        .setTitle('Your Next Bus- Taco :)')
        .setBackgroundImage(makeImage(IMAGE_OBJ.smallImageUrl, 900, 1000, 'LARGE', "Taco"))
        .setTextContent(makePlainText(TEXT.text))
        .build();
    return template;
}

function templateDirective() {
    const td = {
        type: 'Display.RenderTemplate',
        template: createTemplate()
    };
    return [td];
}

function speakableTextTransform(buses) {
    var speakableText = "";
    Object.keys(buses).forEach(function(key) {
        var s = "The next " + key + " is in " + buses[key].join(" minutes, ") + " minutes.";
        var lastIndexOfComma = s.lastIndexOf(',');
        s = s.slice(0, lastIndexOfComma) + s.slice(lastIndexOfComma + 1, s.length);
        s = s.insert(lastIndexOfComma, " and");
        speakableText += s + " ";
    });
    return speakableText;
}

function tfl(context, callback, speakableText) {
    var busId = getBusId(context);
    var options = {
        host: 'api.tfl.gov.uk',
        path: getPathByBusId(busId),
        port: 443,
    };

    var result = {};
    var speak = "Sorry I am not able to find it right now!";
    var displayText = "";
    var body = "";
    //this is the call
    var request = https.get(options, function(res) {
        var response;

        res.on('data', function(data) {
            body += data;
        });
        console.log("Obtained bus number as - " + busId);
        var busesAndTimeRemaining = {};
        var buses = {};
        res.on('end', function() {
            try {
                response = JSON.parse(body);
                response.filter(function(r) {
                    return filterByBusId(busId, r.lineName);
                }).sort(function(a, b) {
                    //Sort based on the ETA
                    if (a.timeToStation < b.timeToStation) {
                        return -1;
                    } else {
                        return 1;
                    }
                }).map(function(x) {
                    //Extract the information which is relevant
                    var b = {
                        "bus": x.lineName,
                        "timeRemaining": Math.floor(x.timeToStation / 60)
                    };
                    return b;
                }).filter(function(b) {
                    return b.timeRemaining > 1;
                }).forEach(function(x) {
                    // Extract two maps, one for speaking, one for showing.
                    if (busesAndTimeRemaining[x.bus] == null) {
                        busesAndTimeRemaining[x.bus] = x.timeRemaining;
                    }
                    if (buses[x.bus] == null) {
                        buses[x.bus] = [];
                    }
                    buses[x.bus].push(x.timeRemaining);
                });
                console.log("Display map : " + JSON.stringify(buses));
                Object.keys(buses).forEach(function(key) {
                    displayText += "Bus no - " + key + " (in mins): " + buses[key].join(",") + ".\n";
                });
                console.log("Speak map : " + JSON.stringify(busesAndTimeRemaining));
                console.log("Display text : " + displayText);
                speak = "";
                if (!speakableText) {
                    Object.keys(busesAndTimeRemaining).forEach(function(key) {
                        speak += "The next " + key + " is in " + busesAndTimeRemaining[key] + " minutes,"
                    });
                    speak = speak.substring(0, speak.length - 1);
                } else {
                    console.log("Using injected speakable text transformer");
                    speak = speakableText(buses);
                }
                result.reprompt = "Do you want to know the complete list?";
                console.log("Speakable text : " + speak);
                if (context.handler.state == states.END) {
                    result.speak = speak;
                    result.emitType = ":tell";
                } else {
                    context.handler.state = states.END;
                    result.speak = speak + " . " + result.reprompt;
                    result.emitType = ":ask";
                }

            } catch (e) {
                console.log("Error ", e);
                result.emitType = ":tell";
            }
            result.title = "Your Next Bus";
            result.content = displayText;
            TEXT.text = result.content;
            callback.call(context, result);
        });

        res.on('error', function(e) {
            console.log("Got error: " + e.message);
            result.speak = speak;
            callback.call(context, result);
        });


    });
}

function getPathByBusId(busId){
    if(!busId || (busId && !BUS_NUMBER_ID_MAP[busId])){
        return BUS_NUMBER_ID_MAP.default;
    }else {
        return BUS_NUMBER_ID_MAP[busId];
    }
}

function getBusId(context) {
    if(context.attributes['busNumber']){
        return context.attributes['busNumber'];
    }
    let slots = context.event.request.intent.slots
    if (slots && slots.busNumber && slots.busNumber.value) {
        context.attributes['busNumber'] = slots.busNumber.value;
        return slots.busNumber.value
    } else {
        return null;
    }
}

function filterByBusId(busId, busIdToCheck) {
    return (busId && busIdToCheck == busId) || !busId;
}


/******** Main method **********************/

exports.handler = function(event, context) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(newSessionHandlers, startStateHandlers, endStateHandlers);
    alexa.execute();
};