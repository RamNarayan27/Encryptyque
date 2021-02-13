const NodeRSA = require("node-rsa");
const axios = require("axios");
const { parse, stringify } = require("flatted");
const bcrypt = require('bcrypt')
const https = require('https')

const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

const instance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
});

user_details = {
  fullName: "zuko",
  userName: 'zuko',
  password: 'testpass',
  email: "zuko@gmail.com",
  phone: "+917358290362"
};

temps = stringify(user_details);
let temp_encrypted = server_pubkey.encrypt(temps);
let hexEnc = Buffer.from(temp_encrypted).toString('hex');
//console.log(user_details)
url = 'https://3.131.252.234:8443/api/generalusersignup/' + hexEnc + "/";

//console.log(url)
function axiosTest() {
  return instance.get(url).then(response => response.data)
}

console.log(axiosTest().then(function (data) {
  console.log(data)
}))

