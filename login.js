const AWS = require("aws-sdk");
const bcrypt = require("bcrypt");
const http = require("http");
const dataStore = require("data-store")({path: process.cwd() + '/creds.json'});

AWS.config.update({
    region: "ap-south-1"
});

const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

let docClient = new AWS.DynamoDB.DocumentClient();

let table = "user_details";

function readAndValidate(){
    let userName = document.getElementById("username");
    let password = document.getElementById("password");
    
}