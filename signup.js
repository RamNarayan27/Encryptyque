const NodeRSA = require("node-rsa");
const axios = require("axios");
const bcrypt = require('bcrypt');
const { parse, stringify } = require("flatted");
const dataStore = require("data-store")({
  path: process.cwd() + "/conf.json",
});
/**
 * TODO Encrypt and send the data to the api endpoint
 * TODO Set Alerts based on the messages
 */

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
      url = "http://localhost:5000/api/generalusersignup/" + hexEnc;
      let response = axiosTest().then(function (data) {
        switch (data) {
          case "DONE":
            //redirect to otpverify.html
            window.location.href = "otpverify.html";
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
  return axios.get(url).then((response) => response.data);
}
