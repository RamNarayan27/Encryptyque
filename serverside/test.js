const NodeRSA = require("node-rsa");
const axios = require("axios");
const { parse, stringify } = require("flatted");
const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

let fname = "aish";
let uname = "test1dff22323";
let pass = "mypass";
let em = "aish@gmail.com";
let ph = "+919500182212";

user_details = {
  fullName: fname,
  userName: uname,
  password: pass,
  email: em,
  phone: ph,
};  

temps = stringify(user_details);
let temp_encrypted = server_pubkey.encrypt(temps);
let hexEnc = Buffer.from(temp_encrypted).toString('hex');
console.log(hexEnc);
url = 'http://localhost:5000/api/generaluserlogin/' + hexEnc;

const res = axios.get(url);

console.log(res.data);