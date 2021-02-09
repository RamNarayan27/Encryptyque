const NodeRSA = require("node-rsa");
const { parse, stringify } = require("flatted");
const Base64 = require("js-base64");
const Base32 = require("base32");

const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

let fname = "Vishal";
let uname = "test123";
let pass = "mypass";
let em = "vishalvigneshk@gmail.com";
let ph = "9500182212";

user_details = {
  fullName: fname,
  uniqueUserName: uname,
  password: pass,
  email: em,
  phone: ph,
};
/**
 * * encrypt and send
 */
temps = stringify(user_details);
let temp_encrypted = server_pubkey.encrypt(temps);
let hexEnc = Buffer.from(temp_encrypted).toString('hex');

/**instead of console.log send a GET request to the server at /api/usersignup/hexEnc */
console.log(hexEnc);