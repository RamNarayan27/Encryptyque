const NodeRSA = require("node-rsa");
const axios = require("axios");
const { parse, stringify } = require("flatted");
const dataStore = require("data-store")({
  path: process.cwd() + "/conf.json",
});
const https = require("https");
let resendvalue = 0;
/**
 * TODO Send the otp entered by the user to the api endpoint
 * TODO Authenticate Accordingly - 1
 * TODO Resend Otp functionality send the data to the api endpoint
 * TODO Authenticate Accordingly - 2
 * TODO Alerts for responses
 */
/**
 * @params to send are resend value, otp, userName
 */

const instance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
});

const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

let url = "";

function resendValInc() {
  if (resendvalue == 0) {
    resendvalue++;
    document.getElementById("verify-btn").disabled = true;
    document.getElementById("resend-btn").disabled = true;
    otpVerify();
  } else {
    document.getElementById("verify-btn").disabled = true;
    document.getElementById("resend-btn").disabled = true;
  }
}

function otpVerify() {
  document.getElementById("verify-btn").disabled = true;
  document.getElementById("resend-btn").disabled = true;
  let otp = document.getElementById("otp-verify");
  let userNames = dataStore.get("unique-username");
  let userDetails = {
    userName: userNames,
    OTP: otp.value,
  };
  let stringUserDetails = stringify(userDetails);
  let encryptedDetails = server_pubkey.encrypt(stringUserDetails);
  let hexEnc = Buffer.from(encryptedDetails).toString("hex");
  url =
    "https://3.131.252.234:8443/api/generaluserverify/" +
    hexEnc +
    "/" +
    String(resendvalue);
  let response = axiosTest().then(function (data) {
    console.log(data);
    switch (data) {
      case "INVALID USERNAME/PASSWORD":
        //This error cannot happen unless server side ussue : just alert invalid username/password
        //TODO Alert message
        //redirect to signup page
        window.location.href = "signup.html";
        break;
      case "ERROR: UNABLE TO RESET OTP":
        //TODO Alert message
        //this happens normally cas of a server side issue..just alert to try again or contact helpdesk (dont forget to enable the two buttons)
        //update error, try again or sth //TODO Check
        break;
      case "SUCCESS: OTP RESET":
        //TODO Alert message
        //enable verify button again
        document.getElementById("verify-btn").disabled = false;
        resendvalue = 0;
        break;
      case "ERROR: OTP MISMATCH`":
        //TODO Alert message
        //we might have to enable the buttons again or find another way to deal with this
        // we can ask him to click on resend otp
        console.log('in the case where the buttons should be enabled');
        document.getElementById("verify-btn").disabled = false;
        document.getElementById("resend-btn").disabled = false;
        break;
      case "SUCCESS: OTP VERIFIED":
        window.location.href = "index.html";
        break;
    }
  });
}

function axiosTest() {
  return instance.get(url).then((response) => response.data);
}
