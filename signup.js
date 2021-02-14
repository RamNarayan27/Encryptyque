const NodeRSA = require("node-rsa");
const axios = require("axios");
const bcrypt = require('bcrypt');
const { parse, stringify } = require("flatted");
const dataStore = require("data-store")({
  path: process.cwd() + "/conf.json",
});
const https = require('https')
const Swal = require('sweetalert2')
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';


/**
 * TODO Set Alerts based on the messages
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

function checkAndWrite() {
  
  let fullName = document.getElementById("fullName");
  let uniqueUserName = document.getElementById("uniqueUser");
  let password = document.getElementById("password");
  let confirmPassword = document.getElementById("confirmPassword");
  let email = document.getElementById("email");
  let phone = document.getElementById("phone");
  if (password.value == confirmPassword.value) {
    x = bcrypt.hash(password.value, 10, function (err, hash) {
      let user_details = {
        fullName: fullName.value,
        userName: uniqueUserName.value,
        password: hash,
        email: email.value,
        phone: phone.value,
        OTPVerified: 'false'
      };
      dataStore.set("unique-username", uniqueUserName.value);
      let stringUserDetails = stringify(user_details);
      let encryptedDetails = server_pubkey.encrypt(stringUserDetails);
      let hexEnc = Buffer.from(encryptedDetails).toString("hex");
      url = "https://3.131.252.234:8443/api/generalusersignup/" + hexEnc + '/';

      Swal.fire({
        icon: 'info',
        title: '<p style="color:#FFF";>Please Wait</p>',
        width: '350',
        html: '<p style="color:#FFF";>Please wait while we try to sign you up</p>',
        background: '#000000',
        allowOutsideClick: false,
        showConfirmButton: false
      })

      let response = axiosTest().then(function (data) {
        switch (data) {
          case "ERROR: USER EXISTS": 
            Swal.fire({
              icon: 'error',
              title: '<p style="color:#FFF";>Username Exists</p>',
              width: '350',
              html: '<p style="color:#FFF";>The unique username already exists, try a different username</p>',
              background: '#000000'
            })
            console.log('User Exists')
            break;

          case "SUCCESS: USER CREATION":
            Swal.fire({
              icon: 'success',
              title: '<p style="color:#FFF";>Success</p>',
              width: '350',
              html: '<p style="color:#FFF";>The User has been successfully created, please verify your OTP now</p>',
              background: '#000000'
            }).then((result) =>{
              window.location.href = "otpverify.html";
            })
            //redirect to otpverify.html
            break;
          default:
            console.log(data);
        }
      });
    });
  } else {
    alert("password mismatch");
  }
}
function axiosTest() {
  return instance.get(url).then((response) => response.data);
}
