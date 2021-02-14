const cred = require('data-store')({ path: process.cwd() + '/creds.json' });
const NodeRSA = require("node-rsa");
const { parse, stringify } = require("flatted");
const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");


cred_details = cred.get("creds");
let prepData = Buffer.from(cred_details, "hex");
let decryptedData = server_pubkey.decryptPublic(prepData);
let formattedData = decryptedData.toString();
let finalData = parse(formattedData);
console.log(finalData);