//dependncies
const data = require("./data");
const http = require("http");
const https = require("https");
const { parseJSON } = require("../helpers/utilities");
const url = require("url");
const { sendTwilioSms } = require("../helpers/notification");

//worker object - module scaffolding
const worker = {};

//lookup all the checks
worker.gatherAllChecks = () => {
  //get all checks
  data.list("checks", (err, checks) => {
    if (!err && checks && checks.length > 0) {
      checks.forEach((check) => {
        //read the check data
        data.read("checks", check, (err, originalCheckData) => {
          if (!err && originalCheckData) {
            //pass the data to process
            worker.validateCheckData(parseJSON(originalCheckData));
          } else {
            console.log("Error reading one of the checks data.");
          }
        });
      });
    } else {
      console.log("Error: Could not find any checks to process.");
    }
  });
};

//Validate check data
worker.validateCheckData = (originalCheckData) => {
  if (originalCheckData && originalCheckData.id) {
    originalCheckData.state =
      typeof originalCheckData.state === "string" &&
      ["up", "down"].indexOf(originalCheckData.state) > -1
        ? originalCheckData.state
        : "down";

    originalCheckData.lastChecked =
      typeof originalCheckData.lastChecked === "number" &&
      originalCheckData.lastChecked > 0
        ? originalCheckData.lastChecked
        : false;

    //pass to the next process
    worker.performCheck(originalCheckData);
  } else {
    console.log("Error: Check was invalid.");
  }
};

//perform check
worker.performCheck = (originalCheckData) => {
  //prepare the initial check outcome
  let checkOutcome = {
    error: false,
    responseCode: false,
  };
  //mark the outcome has not been sent yet
  let outcomeSent = false;

  //parse the hostname and full url from original data
  let parsedUrl = url.parse(
    originalCheckData.protocol + "://" + originalCheckData.url,
    true
  );
  let hostname = parsedUrl.hostname;
  const path = parsedUrl.path;

  const requestDetails = {
    protocol: originalCheckData.protocol + ":",
    hostname: hostname,
    method: originalCheckData.method.toUpperCase(),
    path: path,
    timeout: originalCheckData.timeoutSeconds * 1000,
  };

  const protocolToUse = originalCheckData.protocol === "http" ? http : https;

  let req = protocolToUse.request(requestDetails, (res) => {
    //get the status code
    const status = res.statusCode;

    //update the check outcome and pass to the next process
    checkOutcome.responseCode = status;
    if (!outcomeSent) {
      worker.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on("error", (e) => {
    checkOutcome = {
      error: true,
      value: e,
    };
    if (!outcomeSent) {
      worker.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on("timeout", () => {
    checkOutcome = {
      error: true,
      value: 'timeout',
    };
    if (!outcomeSent) {
      worker.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  //request send
  req.end();
};

//save check outcome to database & send to next process
worker.processCheckOutcome = (originalCheckData, checkOutcome) => {
  //check if checkoutcome is up or down
  let state =
    !checkOutcome.error &&
    checkOutcome.responseCode &&
    originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1
      ? "up"
      : "down";

  //decide whether we should alert the user or not
  let alerWanted =
    originalCheckData.lastChecked && originalCheckData.state !== state
      ? true
      : false;

  //update the checkdata
  let newCheckData = originalCheckData;

  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  //update the check to disk
  data.update("checks", newCheckData.id, newCheckData, (err) => {
    if (!err) {
      if (alerWanted) {
        //send the checkdata to next process
        worker.alertUserToStatusChange(newCheckData);
      } else {
        console.log("Alert is not needed as the state has not changed yet");
      }
    } else {
      console.log("Error to save check data of one of the checks.");
    }
  });
};

//send notification sms to user if state changes
worker.alertUserToStatusChange = (newCheckData) => {
  let msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${
    newCheckData.protocol
  }://${newCheckData.url} is currently ${newCheckData.state}`;

  sendTwilioSms(newCheckData.userPhone, msg, (err) => {
    if(!err) {
        console.log(`User was notified to a status change via SMS: ${msg}`)
    } else {
        console.log('There was a problem sending sms to one of the user.')
    }
  })
};

//timer to execute the worker process once per minute
worker.loop = () => {
  setInterval(() => {
    worker.gatherAllChecks();
  }, 1000 * 10);
};

//start the worker
worker.init = () => {
  //execute all the checks
  worker.gatherAllChecks();

  //call the loop so that checks continues
  worker.loop();
};

//export
module.exports = worker;
