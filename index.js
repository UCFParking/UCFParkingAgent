"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const scrape_garage = require("./scrape-ucf-garage");
const predict_garage = require("./prediction-ucf-garage");
const converter = require("number-to-words");
const restService = express();

const garages = {
  "A": 0,
  "B": 1,
  "C": 2,
  "D": 3,
  "H": 4,
  "I": 5,
  "Libra": 6
}

const garage_capacity = {
  "A": 1623,
  "B": 1259,
  "C": 1852,
  "D": 1241,
  "H": 1284,
  "I": 1231,
  "Libra": 1007
}

const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

restService.use(
  bodyParser.urlencoded({
    extended: true
  })
);

restService.use(bodyParser.json());

restService.post("/garage", function(req, res) {
  var intent = intents[req.body.queryResult.intent.displayName];

  console.log("Running intent: " + req.body.queryResult.intent.displayName);

  if(intent != intentGaragePredict){
    scrape_garage().then(function(garageJSON){
        if (intent)
          return intent(req, res, garageJSON);

        return res.json({});
    });
  }else{
    if(req.body.queryResult.parameters.timeuntil){
      var date = new Date(req.body.queryResult.parameters.timeuntil);

      predict_garage(days[date.getDay()],date.getHours(),date.getMinutes()).then(function(garageJSON){
        if(intent)
          return intent(req,res,garageJSON);

        return res.json({});
      })
    }else{
      res.json({});
    }
  }
});

restService.listen(process.env.PORT || 8000, function() {
  console.log("Server up and listening");
});

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}





const intents = {
  "Spots Left Intent": intentSpotsLeft,
  "Spots Taken Intent": intentSpotsTaken,
  "Garage Prediction Intent": intentGaragePredict,
  "Garage Status Intent": intentGarageStatus
}


function subAlias(number){
  return "<sub alias=\""+converter.toWords(number)+"\">"+number+"</sub>";
}





var flavortextSpotsLeft = {
  0: function(garage, count) {
    return (count < 50) ? "<speak>Only " + subAlias(count) + " spots left in Garage " + garage + "!</speak>" : "<speak>There's " + subAlias(count) + " spots left in Garage " + garage + "!</speak>";
  },
  1: function(garage, count) {
    return "<speak>There's " + subAlias(count) + " parking spots in Garage " + garage + ".</speak>";
  },
  2: function(garage, count) {
    return "<speak>" +subAlias(count)+ " spots in Garage " +  garage + ".</speak>";
  },
  3: function(garage, count) {
    return "<speak>Garage " + garage + " currently has " + subAlias(count) + " spots left.</speak>";
  },
  4: function(garage, count) {
    return "<speak>There are " + subAlias(count) + " spots left in Garage " + garage+".</speak>";
  }
}

function intentSpotsLeft(req, res, garageJSON){
  var flavorCounter1 = getRandomInt(5);
  var garage_name = req.body.queryResult.parameters.garage;
  var responseText;

  if (garageJSON[garages[garage_name]])
    responseText = flavortextSpotsLeft[flavorCounter1](garage_name, parseInt(garageJSON[garages[garage_name]]));

  return res.json({
    "payload": {
      "google": {
        "expectUserResponse": true,
        "richResponse": {
          "items": [
            {
              "simpleResponse": {
                "textToSpeech": responseText
              }
            }
          ],
          "suggestions": [
            {
              "title": "help me"
            },
            {
              "title": "garage status"
            },
            {
              "title": "garage A in 20 minutes"
            }
          ],
          "linkOutSuggestion": {
            "destinationName": "Github",
            "url": "https://github.com/UCFParking/UCFParkingAgent"
          }
        }
      }
    }
  });
}

var flavortextSpotsTaken = {
  0: function(garage, count, total){
    return "<speak>In " + garage + ", there are " + subAlias(count) + " cars parked out of " + subAlias(total)+".</speak>";
  },
  1: function(garage, count, total){
    return "<speak>There are " + count.toString() + " cars out of " + subAlias(total) + " in Garage " + garage+".</speak>" ;
  },
  2: function(garage, count, total){
    return "<speak>Garage " + garage + " is " + Math.round(Math.min(100, Math.max(0, (count/total)*100))).toString() + "% full.</speak>";
  }
}

function intentSpotsTaken(req, res, garageJSON){
  var flavorCounter2 = getRandomInt(3);
  var garage_name = req.body.queryResult.parameters.garage;
  var responseText;

  if(garageJSON[garages[garage_name]])
    responseText = flavortextSpotsTaken[flavorCounter2](garage_name, Math.max(0, garage_capacity[garage_name]-parseInt(garageJSON[garages[garage_name]])), garage_capacity[garage_name]);

  return res.json({
    "payload": {
      "google": {
        "expectUserResponse": true,
        "richResponse": {
          "items": [
            {
              "simpleResponse": {
                "textToSpeech": responseText
              }
            }
          ],
          "suggestions": [
            {
              "title": "help me"
            },
            {
              "title": "garage status"
            },
            {
              "title": "garage A in 20 minutes"
            }
          ],
          "linkOutSuggestion": {
            "destinationName": "Github",
            "url": "https://github.com/UCFParking/UCFParkingAgent"
          }
        }
      }
    }
  });
}

function intentGarageStatus(req, res, garage)
{
  return res.json({
    "payload": {
      "google": {
        "expectUserResponse": true,
        "richResponse": {
          "items": [
            {
              "simpleResponse": {
                "textToSpeech": "<speak>Garage A has " + Math.round(Math.min(100, Math.max(0, ((garage[0]/garage_capacity["A"])*100))))+"% available parking. B has " + Math.round(Math.min(100, Math.max(0, ((garage[1]/garage_capacity["B"])*100))))+"%. C has " + Math.round(Math.min(100, Math.max(0, ((garage[2]/garage_capacity["C"])*100))))+"%. D has "+Math.round(Math.min(100, Math.max(0, ((garage[3]/garage_capacity["D"])*100))))+"%. H has "+Math.round(Math.min(100, Math.max(0, ((garage[4]/garage_capacity["H"])*100)))) + "%. I has "+Math.round(Math.min(100, Math.max(0, ((garage[5]/garage_capacity["I"])*100)))) +"%. Libra has "+Math.round(Math.min(100, Math.max(0, ((garage[6]/garage_capacity["Libra"])*100)))) +"%. </speak>"
              }
            },
            {
              "tableCard": {
                "title": "Garage Status",
                "columnProperties": [
                  {
                    "header": "Garage Name"
                  },
                  {
                    "header": "Spaces Available"
                  }
                ],
                "rows": [
                  {
                    "cells": [
                      {
                        "text": "Garage A"
                      },
                      {
                        "text": garage[0] + "/" + garage_capacity["A"]
                      }
                    ],
                    "dividerAfter": true
                  },
                  {
                    "cells": [
                      {
                        "text": "Garage B"
                      },
                      {
                        "text": garage[1] + "/" + garage_capacity["B"]
                      }
                    ],
                    "dividerAfter": true
                  },
                  {
                    "cells": [
                      {
                        "text": "Garage C"
                      },
                      {
                        "text": garage[2] + "/" + garage_capacity["C"]
                      }
                    ],
                    "dividerAfter": true
                  },
                  {
                    "cells": [
                      {
                        "text": "Garage D"
                      },
                      {
                        "text": garage[3] + "/" + garage_capacity["D"]
                      }
                    ],
                    "dividerAfter": true
                  },
                  {
                    "cells": [
                      {
                        "text": "Garage H"
                      },
                      {
                        "text": garage[4] + "/" + garage_capacity["H"]
                      }
                    ],
                    "dividerAfter": true
                  },
                  {
                    "cells": [
                      {
                        "text": "Garage I"
                      },
                      {
                        "text": garage[5] + "/" + garage_capacity["I"]
                      }
                    ],
                    "dividerAfter": true
                  },
                  {
                    "cells": [
                      {
                        "text": "Garage Libra"
                      },
                      {
                        "text": garage[6] + "/" + garage_capacity["Libra"]
                      }
                    ],
                    "dividerAfter": true
                  }
                ]
              }
            }
          ],
          "suggestions": [
            {
              "title": "help me"
            },
            {
              "title": "garage B?"
            },
            {
              "title": "garage A in 20 minutes"
            }
          ],
          "linkOutSuggestion": {
            "destinationName": "Github",
            "url": "https://github.com/UCFParking/UCFParkingAgent"
          }
        }
      }
    }
  });
}

/**
 * Formats minutes into hours / minutes
 * 
 * @param {number} minutes Total number of minutes
 * @return {string} Formatted hours / minutes string ex: "1 hour and 30 minutes"
 */

function flavortextTime (minutes) {
  var timetext = "";
  var hours = minutes % 60;
  minutes -= hours * 60;

  //Hours  
  if (hours == 1) {
    timetext += "1 hour";
  }
  else if (hours > 1) {
    timetext += hours + " hours";
  }

  //Add "and" if adding minutes
  if (hours > 0 && minutes > 0) {
    timetext += " and ";
  }
  //Minutes
  if (minutes == 1) {
    timetext += "1 minute";
  }
  else if (minutes > 1) {
    timetext += minutes + " minutes"
  }
  return timetext;
}

var flavortextGaragePredict = {
  0: function(name,max,number,minute){
    return "<speak> " + flavortextTime(minute) + " from now, Garage " + name + " will have " + subAlias(number) + " out of " + subAlias(max) + " available spots!</speak>";
  },
  1: function(name,max,number,minute){
    return "<speak> Garage " + name + " in " + flavortextTime(minute) + ", will have " + subAlias(number) + " out of " + subAlias(max) + " open parking spots.</speak>";
  },
  2: function(name,max,number,minute){
    return "<speak> Garage " + name + " will have " + subAlias(number) + " out of " + max + " open spots in " + flavortextTime(minute) + "!</speak>";
  },
  3: function(name,max,number,minute){
    return "<speak> Garage " + name + " is predicted to have " + Math.round(Math.min(100, Math.max(0, ((number/max)*100)))) + " percent available spots in " + minute + " minutes!</speak>";
  }
}

function intentGaragePredict(req, res, garageJSON){
  var garage_name = req.body.queryResult.parameters.garage;
  var time = new Date();
  var delaytime = new Date(req.body.queryResult.parameters.timeuntil);
  var second = Math.abs(time.getTime()-delaytime.getTime())/1000;
  var minute = Math.ceil(second/60);

  var responseText;
  //Set to 3 to remove percent available for prediction
  var flavorCounter3 = getRandomInt(3);

  if(garage_name != "Libra"){
    garage_name = garage_name.charAt(0).toUpperCase();
  }

  if(garageJSON[garage_name])
    responseText = flavortextGaragePredict[flavorCounter3](garage_name, garage_capacity[garage_name], garageJSON[garage_name], minute);

  return res.json({
    "payload": {
      "google": {
        "expectUserResponse": true,
        "richResponse": {
          "items": [
            {
              "simpleResponse": {
                "textToSpeech": responseText
              }
            }
          ],
          "suggestions": [
          {
            "title": "help me"
          },
          {
            "title": "garage B?"
          },
          {
            "title": "garage status"
          }
          ],
          "linkOutSuggestion": {
            "destinationName": "Github",
            "url": "https://github.com/UCFParking/UCFParkingAgent"
          }
        }
      }
    }
  });
}
