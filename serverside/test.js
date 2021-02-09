const NodeRSA = require("node-rsa");
const axios = require("axios");
const { parse, stringify } = require("flatted");
const bcrypt = require('bcrypt')
const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

//SIGNUP AND SIGNIN PAGE CLIENT SIDE
/*



*/


user_details = {
  //fullName: "aish",
  userName: 'test122323',
  OTP: '907950'
  //password: 'testpass',
  //email: "aish@gmail.com",
  //phone: "19500182212"
};

temps = stringify(user_details);
let temp_encrypted = server_pubkey.encrypt(temps);
let hexEnc = Buffer.from(temp_encrypted).toString('hex');
console.log(user_details)
url = 'http://localhost:5000/api/generaluserverify/' + hexEnc + '/0';

console.log(url)
function axiosTest() {
  return axios.get(url).then(response => response.data)
}

console.log(axiosTest().then(function (data) {
  console.log(data)
}))

