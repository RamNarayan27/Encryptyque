const NodeRSA = require("node-rsa");
const axios = require("axios");
const { parse, stringify } = require("flatted");
const dataStore = require("data-store")({
  path: process.cwd() + "/creds.json",
});
const https = require("https");
const Swal = require('sweetalert2')

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
    if (resendvalue == 1) text_to_display='<p style="color:#FFF";>Please wait while we resend your OTP</p>'
    else text_to_display='<p style="color:#FFF";>Please wait while we check your OTP</p>'
    Swal.fire({
      icon: 'info',
      title: '<p style="color:#FFF";>Please Wait</p>',
      width: '350',
      html: text_to_display,
      background: '#000000',
      allowOutsideClick: false,
      showConfirmButton: false
    })
    
  let response = axiosTest().then(function (data) {
    console.log(data);
    switch (data) {
      case "INVALID USERNAME/PASSWORD":
        Swal.fire({
          icon: 'error',
          title: '<p style="color:#FFF";>Invalid Username/Password</p>',
          width: '350',
          html: '<p style="color:#FFF";>Please check the username/password</p>',
          background: '#000000'
        })
        //This error cannot happen unless server side ussue : just alert invalid username/password
        //TODO Alert message
        //redirect to signup page
        break;
      case "ERROR: UNABLE TO RESET OTP":
        Swal.fire({
          icon: 'error',
          title: '<p style="color:#FFF";>Error</p>',
          width: '350',
          
          
          html: '<p style="color:#FFF";>Unable to Reset the OTP, Please try again</p>',
          background: '#000000'
        }).then((result) => {
          document.getElementById("verify-btn").disabled = false;
          document.getElementById("resend-btn").disabled = false;
        })

        //TODO Alert message
        //this happens normally cas of a server side issue..just alert to try again or contact helpdesk (dont forget to enable the two buttons)
        //update error, try again or sth //TODO Check
        break;
      case "SUCCESS: OTP RESET":
        //TODO Alert message
        //enable verify button again
        Swal.fire({
          icon: 'success',
          title: '<p style="color:#FFF";>Success</p>',
          width: '350',
          
          
          html: '<p style="color:#FFF";>Your New OTP has been sent to your Mobile</p>',
          background: '#000000'
        }).then((result) => {
          document.getElementById("verify-btn").disabled = false;
          resendvalue = 0;
        })

        break;
      case "ERROR: OTP MISMATCH":
        Swal.fire({
          icon: 'error',
          title: '<p style="color:#FFF";>Invalid OTP</p>',
          width: '350',
          
          
          html: '<p style="color:#FFF";>Please check if you have entered the correct OTP</p>',
          background: '#000000'
        }).then((result) => {
          document.getElementById("verify-btn").disabled = false;
          document.getElementById("resend-btn").disabled = false;
        })
        break;
      case "SUCCESS: OTP VERIFIED":
        Swal.fire({
          icon: 'success',
          title: '<p style="color:#FFF";>OTP Verified</p>',
          width: '350',
          html: '<p style="color:#FFF";>OTP successfully verified, please proceed to Login</p>',
          background: '#000000'
        }).then((result) => {
          window.location.href = "index.html";
        })
        break;
    }
  });
}

function axiosTest() {
  return instance.get(url).then((response) => response.data);
}
