/*
needed functions : 
1) Encoding a File To Base64 ✔ 
2) Requesting Public Key of Recipient from AWS ✔
3) Encrypting the file using an AES256 Bit Key ✔
4) Encrypting the AES Key using the RSA Public Key ✔
5) Uploading the File and the Encrypted Key to AWS
6) Generating Public+Private Keypair ✔
7) Sending Public Key to Server ✔
8) Checking the inbox and downloading file when download is clicked ✔
*/

//Imports
const AWS = require("aws-sdk");
const https = require('https')
const NodeRSA = require("node-rsa");
const cred = require('data-store')({ path: process.cwd() + '/creds.json' });
conf_name = cred.get('unique-username')
const conf = require("data-store")({ path: process.cwd() + "/" + conf_name + ".json" });
const rec_list = require("data-store")({
  path: process.cwd() + "\\friend_list.json",
});
const out_list = require("data-store")({
  path: process.cwd() + "\\outbox.json",
});
const inbox = require("data-store")({ path: process.cwd() + "/inbox.json" });
const { parse, stringify } = require("flatted");
const crypto = require("crypto");
const file_manager = require("fs");
const fs = require('fs')
const Base64 = require("js-base64");
const { callbackify } = require("util");
const notifier = require("node-notifier");
const Swal = require('sweetalert2')
const path = require("path");
const axios = require('axios')

const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

cred_details = cred.get("creds");
let prepData = Buffer.from(cred_details, "hex");
let decryptedData = server_pubkey.decryptPublic(prepData);
let formattedData = decryptedData.toString();
let finalData = parse(formattedData);

accesskey = finalData.AccessKey.AccessKeyId;
secretkey = finalData.AccessKey.SecretAccessKey;

//Initial Runs and Variable Declarations
if (!conf.has("unique-username")) console.log("Missing Unique Username");

AWS.config.update({
  region: "ap-south-1",
  //accessKeyId: accesskey,
  //secretAccessKey: secretkey,
});

// A simple function to check if the private key + public key is generated
if (conf.get("key-status") !== "true") {
  send_public_key()
}

if (!file_manager.existsSync("./inbox")) {
  file_manager.mkdirSync("./inbox");
}
if (!file_manager.existsSync("./outbox")) {
  file_manager.mkdirSync("./outbox");
}

// A simple function to check the length of the inbox
async function setinboxlength() {
  try {
    const inbox_data = file_manager.readFileSync("inbox.json");
    const inbox_i = JSON.parse(inbox_data);
    const len = Object.keys(inbox_i).length;
    conf.set("inbox-length", len);
  } catch (err) {
    console.log("No file");
    conf.set("inbox-length", 0);
  }
}

// Simple functions that returns user Public Key and private key
function mypublickey() {
  return parse(conf.get("publickey"));
}
function myprivatekey() {
  return parse(conf.get("privatekey"));
}

// A simple function to send the public key to the Server
function send_public_key() {
  const docClient = new AWS.DynamoDB.DocumentClient();
  const user_table = "user_publickey";
  const params = {
    TableName: user_table,
    Item: {
      username: conf.get("unique-username"),
      publickey: mypublickey(),
    },
  };
  console.log(params)

  docClient.put(params, function (err, data) {
    if (err) {
      console.error("Failed To Add", err);
    } else {
      console.log("Successfully Added");
      conf.set('key-status','true')
    }
  });
}

// A simple function using Async Promise to Convert A file to Base64
async function new_toBase64(filelocation) {
  const obj = file_manager.readFileSync(filelocation);
  return Base64.btoa(obj);
}

// A simple function to request the public key of the recipient from the server
async function request_public_key(recipient_username) {
  const docClient = new AWS.DynamoDB.DocumentClient();
  const user_table = "user_publickey";

  if (!rec_list.has(recipient_username)) {
    const param = {
      TableName: user_table,
      Key: {
        username: recipient_username,
      },
    };
    docClient.get(param, function (err, data) {
      if (err) {
        console.error("Unable to read item.");
      } else {
        console.log(typeof data.Item.publickey);
        const newData = data.Item.publickey.replaceAll("\n", "\\n");
        //console.log("GetItem succeeded:", data.Item.publickey);
        rec_list.set(data.Item.username, data.Item.publickey);
      }
    });
  }
}

async function discard_share(){
  out_list.clear();
}

// A simple function to prepare the file for uploading
async function file_prepare(file, recipient_list) {
  let promise = new Promise(function (resolve, reject) {
    encoded_promise = new_toBase64(file);
    encoded_promise
      .then(function (result) {
        key = crypto.pbkdf2Sync(
          randomstring.generate(10),
          crypto.randomBytes(16),
          100000,
          256 / 8,
          "sha256"
        );
        const iv = Buffer.alloc(16, 0);
        cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        cipher.write(result);
        cipher.end();

        let splits = file.toString().split("\\");
        const fname = splits[splits.length - 1];
        extn = fname.split(".");
        const ext = extn[extn.length - 1];
        const enc_data = [cipher.read(), key, iv, file, fname, ext];
        return enc_data;
      })
      .then(function (result) {
        for (let name of recipient_list) {
          rec_pub_key = rec_list.get(name);
          const pub_key = new NodeRSA(rec_pub_key, "pkcs8-public-pem");
          //console.log(stringify(result[2]))
          const encrypted_key = pub_key.encrypt(result[1]);
          const encrypted_iv = pub_key.encrypt(result[2]);

          outbox_id = randomstring.generate(10) + randomstring.generate(10);
          const random_fname = randomstring.generate(25) + "." + result[5];
          result.pop();
          result.push(random_fname);
          result.push(random_fname);
          out_list.set(outbox_id, {
            rec_id: name,
            enc_key: encrypted_key,
            enc_iv: encrypted_iv,
            file_loc: result[3],
            file_name: result[4],
            enc_fname: random_fname,
            isUploaded: "false",
            isAdded: "false",
          });
          return result;
        }
      })
      .then(function (result) {
        file_manager.writeFile(
          process.cwd() + "\\outbox\\" + result[5],
          result[0],
          function (err) {
            if (err) throw err;
            else console.log("Sent to Outbox!");
          }
        );
        return result;
      });
  });
}

// A simple function to upload the file from the outbox and delete the contents in the outbox
async function send_file() {
  //Contents of result : [cipher.read(),key,iv,file,fname]
  //Structure of Outlist : name,{ enc_key : encrypted_key, enc_iv : encrypted_iv, file_loc : result[3], file_name : result[4]}

  const raw_data = file_manager.readFileSync("outbox.json");
  const list_to_upload = JSON.parse(raw_data);

  for (const [out_id, file_data] of Object.entries(list_to_upload)) {
    let isadded = false;
    let isuploaded = false;
    rec_id = file_data["rec_id"];
    let upload_promise = new Promise(function (success, failed) {
      trans_id = randomstring.generate(12);
      trans_key = file_data["enc_key"];
      trans_iv = file_data["enc_iv"];
      trans_from = conf.get("unique-username");
      trans_to = rec_id;
      trans_filename = file_data["file_name"];
      trans_randomfname = file_data["enc_fname"];

      const docClient = new AWS.DynamoDB.DocumentClient();
      const user_table = "transaction-manifest";
      const trans_param = {
        TableName: user_table,
        Item: {
          transactionid: trans_id,
          encryptionkey: trans_key,
          encryptionIV: trans_iv,
          from: trans_from,
          to: trans_to,
          filename: trans_randomfname,
          actual_name: trans_filename,
        },
      };
      docClient.put(trans_param, function (err, data) {
        if (err) {
          isadded = false;
        } else {
          temp = out_list.get(out_id);
          temp["isAdded"] = "true";
          out_list.del(out_id);
          out_list.set(out_id, temp);
          if (temp["isUploaded"] == "true") {
            out_list.del(out_id);
          }
        }
      });

      if (isadded == true) {
        console.log("Added");
      }
    });

    let file_upload_promise = new Promise(function (success, failed) {
      let isuploaded = false;
      s3 = new AWS.S3({ apiVersion: "2006-03-01" });
      var uploadParams = { Bucket: "cnproject-bucket", Key: "", Body: "" };
      const upload_loc = process.cwd() + "\\outbox\\" + file_data["enc_fname"];
      uploadParams.Key = file_data["enc_fname"];
      var upload_stream = file_manager.createReadStream(upload_loc);
      upload_stream.on("error", function (err) {
        console.log("File Error", err);
      });
      uploadParams.Body = upload_stream;
      s3.upload(uploadParams, function (err, data) {
        if (err) {
          console.log("Error", err);
        }
        if (data) {
          isuploaded = true;
          temp = out_list.get(out_id);
          temp["isUploaded"] = "true";
          console.log("Uploaded");
          out_list.del(out_id);
        }
      });
      if (isuploaded == true) {
        success("Uploaded");
        console.log("test");
      }
    });
  }
}

// A simple function to download the selected share and decrypt it
// ef - encodedfile
// dc - decrypted




//request_public_key('nTbNO')
//file_prepare('aot.png',['nTbNO'])
//send_file()
//refresh_check()
//download_file('mnStwTMvv8Ka')
//delete_file('mnStwTMvv8Ka')
//setinboxlength()