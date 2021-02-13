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
url = 'https://3.131.252.234:8443/api/generalusersignup/' + '1ac324432a74fcfbed30929879ed91ade1d6b003b087c4c62285c1b2ea64e6ac9eceb0c986ba41525f18d417234aff633a6ba6a6cc42c2655d6a7667a0508b087beaa724c3497c5775227c427c56f0751e5a5a2f763b89593e3c7436e4e7d0c75484c4a824876ed364731b32e131c8bff8d78732d1f48072dbe087a134f2d8956198b826ca1efeca8261c399fa2072dd99d50d1854eaa95a129c525ddf21edeab0cd0771b8d510e4d15c350fe8d898915e79c510ab8f404945f2f06a14026e4512033b718ea295d6e0497f4e6e57b910bcfbd13a957479e30abec151340146a54f5ffbb07a17edc16bcf2ac0cc5bbc15571bda1e605699c2dadb11919c140e264f68cb03fb11bb2b1e777fced1b3f8bfa0bb6885367203bd496e4e92be24f28ceec88aa22432eefc0dbde95a867cae3f225d714d727f78463877083aaef7e4f46c86cba789830998fee39c5d55f94e659b7fc45d47471b2c6c8c0362ecb2e4213ffb187ef847f39ba80d3622a2dbf4b628ea1aee9e57525d4fb18627be7b6ccb04982dcb63b6f0dcff545ad24404fd262f3ba946453790bbd1b3d19f0d9013291d3410d77cecaf44e53448a15c2701a054bb2a0c060c9204942a932eb3e73218';

console.log(url)
function axiosTest() {
  return instance.get(url).then(response => response.data)
}

console.log(axiosTest().then(function (data) {
  console.log(data)
}))

