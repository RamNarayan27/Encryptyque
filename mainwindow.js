const fs = require('fs');
const https = require("https");
const Swal = require('sweetalert2')
const axios = require("axios");
const cred_to_rem = require('data-store')({ path: process.cwd() + '/creds.json' });
const { parse, stringify } = require("flatted");
const NodeRSA = require("node-rsa");


const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");