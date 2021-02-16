const fs = require("fs");
const https = require("https");
const Swal = require("sweetalert2");
const axios = require("axios");
const Base64 = require("js-base64");
const cred = require("data-store")({ path: process.cwd() + "/creds.json" });
conf_name = cred.get("unique-username");
const crypto = require("crypto");
const shell = require("electron").shell;
const conf = require("data-store")({
  path: process.cwd() + "/" + conf_name + ".json",
});
const { parse, stringify } = require("flatted");
const NodeRSA = require("node-rsa");
const AWS = require("aws-sdk");
const notifier = require("node-notifier");
const dataStore = require("data-store");
const inbox = require("data-store")({ path: process.cwd() + "/inbox.json" });

function mypublickey() {
  return parse(conf.get("publickey"));
}
function myprivatekey() {
  return parse(conf.get("privatekey"));
}

AWS.config.update({
  region: "ap-south-1",
  //accessKeyId: accesskey,
  //secretAccessKey: secretkey,
});

if (!fs.existsSync("./inbox")) {
  fs.mkdirSync("./inbox");
}
if (!fs.existsSync("./outbox")) {
  fs.mkdirSync("./outbox");
}

const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

const profilePicture = document.getElementById("profile-picture");
const userFullName = document.getElementById("user-fn");
const userId = document.getElementById("user-id");
const quotes = document.getElementById("quotes");
const inbox_html = document.getElementById("inbox");

function setStartUp() {
  userId.innerHTML = conf.get("unique-username");
  userFullName.innerHTML = conf.get("user-fullname");
  quotesFile = JSON.parse(fs.readFileSync("quotes.json"));
  keylist = [];
  Object.keys(quotesFile).forEach(function (key) {
    keylist.push(key);
  });

  randint = Math.floor(Math.random() * 16);
  author = keylist[randint];
  quote = quotesFile[author];
  finalString = `${quote} <br>~ ${author}`;
  quotes.innerHTML = finalString;
  refresh_check();
}

function notifier_info(text) {
  notifier.notify({
    title: "FTPFileShare",
    message: text,
    icon: "file_share.png",
    sound: true,
    timeout: 5,
    wait: false,
    appID: " ",
  });
}

async function delete_file(downloadID) {
  let a_fname = inbox.get(downloadID);
  a_fname = a_fname["actual_name"];
  const path = process.cwd() + "\\inbox\\" + a_fname;
  Swal.fire({
    title: "Delete File?",
    html:
      '<p style="color:#FFF";>Are you sure you wish to delete this file? This file will not be stored by Encryptyque anymore</p>',
    icon: "info",
    background: "#000000",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Delete",
  }).then((result) => {
    if (result.isConfirmed) {
      inbox.del(downloadID);
      try {
        fs.access(path, fs.F_OK, (err) => {
          if (err) {
            console.error(err);
            return;
          }
          fs.unlink(
            path,
            (callback = function () {
              console.log("Deleted file");
            })
          );
        });
      } catch (err) {
        console.log("File hasnt been Downloaded");
      }
      const docClient = new AWS.DynamoDB.DocumentClient();
      const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
      const user_table = "transaction-manifest";
      var bucket_params = {
        Key: downloadID,
        Bucket: "cnproject-bucket",
      };
      const table_params = {
        TableName: user_table,
        Key: {
          transactionid: downloadID,
        },
      };

      docClient.delete(table_params, function (err, data) {
        if (err) {
          console.error("Failed to Delete Share");
        } else {
          console.log("Successfully Deleted Share");
        }
      });

      s3.deleteObject(bucket_params, function (err, data) {
        if (err) console.log("Failed to Delete File");
        else console.log("Deleted File on Storage");
      });
      Swal.fire({
        title: "Success",
        html:
          '<p style="color:#FFF";>The file has been deleted successfully.</p>',
        icon: "success",
        background: "#000000",
        showCancelButton: false,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Delete",
      })
      generateCards();
    }
  });
  generateCards();
}

async function download_file(downloadID) {
  Swal.fire({
    icon: "info",
    title: '<p style="color:#FFF";>Please Wait</p>',
    width: "350",
    html: '<p style="color:#FFF";>Please wait while the file downloads</p>',
    background: "#000000",
    allowOutsideClick: false,
    showConfirmButton: false,
  });
  const priv_key = new NodeRSA(myprivatekey(), "pkcs1-private-pem");
  const ef_info = inbox.get(downloadID);
  const ef_name = ef_info.filename;
  const ef_key = Buffer.from(ef_info.encryptionkey);
  const ef_iv = Buffer.from(ef_info.encryptionIV);
  const ef_actual_name = ef_info.actual_name;

  dc_iv = priv_key.decrypt(ef_iv);
  dc_key = priv_key.decrypt(ef_key);

  //console.log(dc_key)

  s3 = new AWS.S3({ apiVersion: "2006-03-01" });
  var params = {
    Key: ef_name,
    Bucket: "cnproject-bucket",
  };

  s3.getObject(params, function (err, data) {
    if (err) {
      throw err;
    } else {
      encrypted_body = data.Body;
      decipher = crypto.createDecipheriv("aes-256-cbc", dc_key, dc_iv);
      decipher.write(encrypted_body);
      decipher.end();
      decrypted = decipher.read();
      extn = ef_actual_name.split(".").pop();

      var fin = decrypted.toString('hex');
      //fin = fin.replaceAll(" ", "");

      var binaryImg = fin.toString('Base64');
      /*var length = binaryImg.length;
      var ab = new ArrayBuffer(length);
      var ua = new Uint8Array(ab);
      for (var i = 0; i < length; i++) {
        ua[i] = binaryImg.charCodeAt(i);
      }*/
      fs.writeFileSync(process.cwd() + "/inbox/" + ef_actual_name, binaryImg);
      Swal.fire({
        icon: "success",
        title: '<p style="color:#FFF";>Downloaded Successfully</p>',
        width: "350",
        html:
          '<p style="color:#FFF";>The File has downloaded successfully. Check your inbox folder</p>',
        background: "#000000",
        allowOutsideClick: false,
        showConfirmButton: true,
      });
      generateCards();
    }
  });
  generateCards();
}

async function report_file(data) {
  tempdata = inbox.get(data);
  Swal.fire({
    icon: "info",
    title: '<p style="color:#FFF";>Report File?</p>',
    html:
      '<p style="color:#FFF";>Are you sure you wish to report the file? Reporting the file will reveal the contents of the file to the developers</p>',
    background: "#000000",
    showConfirmButton: true,
    showCancelButton: true,
    allowOutsideClick: true,
  }).then((result) => {
    if (result.isConfirmed) {
      const docClient = new AWS.DynamoDB.DocumentClient();
      const user_table = "report-table";
      
      const priv_key = new NodeRSA(myprivatekey(), "pkcs1-private-pem");
      const ef_info = inbox.get(tempdata['transactionid']);
      const ef_key = Buffer.from(ef_info.encryptionkey);
      const ef_iv = Buffer.from(ef_info.encryptionIV);
      dc_iv = priv_key.decrypt(ef_iv);
      dc_key = priv_key.decrypt(ef_key);
      const params = {
        TableName: user_table,
        Item: {
          transactionid: tempdata['transactionid'],
          username: conf.get("unique-username"),
          data: stringify(tempdata),
          dc_key: stringify(dc_key),
          dc_iv: stringify(dc_iv)
        },
      };

      docClient.put(params, function (err, data) {
        if (err) {
          console.error("Failed To Report", err);
        } else {
          console.log("Successfully Reported");
          Swal.fire({
            icon: "success",
            title: '<p style="color:#FFF";>File Reported!</p>',
            html:
              '<p style="color:#FFF";>The file has been successfully reported.</p>',
            background: "#000000",
            showConfirmButton: true,
            allowOutsideClick: true,
          })
        }
      });
    }
  });
}

async function setinboxlength() {
  try {
    const inbox_data = fs.readFileSync("inbox.json");
    const inbox_i = JSON.parse(inbox_data);
    const len = Object.keys(inbox_i).length;
    conf.set("inbox-length", len);
  } catch (err) {
    console.log("No file");
    inbox.set('test','test')
    inbox.del('test')
    setinboxlength()
    conf.set("inbox-length", 0);
  }
}

async function refresh_check() {
  console.log("refresh check");
  const docClient = new AWS.DynamoDB.DocumentClient();
  const refresh_table = "transaction-manifest";
  my_name = conf.get("unique-username");

  var params = {
    TableName: refresh_table,
    FilterExpression: "#to = :my_name",
    ExpressionAttributeNames: {
      "#to": "to",
    },
    ExpressionAttributeValues: {
      ":my_name": my_name,
    },
  };

  docClient.scan(params, onScan);
  function onScan(err, data) {
    try {
      setinboxlength();
    } catch (err) {
      console.log("No Inbox File");
      conf.set("inbox-length", 0);
    }

    old_inbox_length = conf.get("inbox-length");
    if (err) {
      console.error(
        "Unable to scan the table. Error JSON:",
        JSON.stringify(err, null, 2)
      );
    } else {
      data.Items.forEach(function (val) {
        if (!inbox.has(val.transactionid)) {
          val["ReceivedTime"] = Date().toString().split("GMT")[0];
          inbox.set(val.transactionid, val);
        }
      });
      setinboxlength();
      if (conf.get("inbox-length") != old_inbox_length) {
        notifier_info("New Shares Arrived");
      }
    }
    generateCards();
  }
}

function generateCards() {
  inbox_html.innerHTML = "";
  const inbox_data = fs.readFileSync("inbox.json");
  const inbox_i = JSON.parse(inbox_data);
  const len = Object.keys(inbox_i);

  console.log(len);
  for (let dis_key of len) {
    inbox_html.innerHTML =
      inbox_html.innerHTML +
      `<div class="column is-one-quarter">
      <div class="card">
          <div class="card-content has-text-centered">From<br>${
            inbox.get(dis_key).from
          }<br>File
              Name:<br>${inbox.get(dis_key).actual_name}<br></div>
          <div class="card-footer">
              <div class="card-footer-item" onclick="download_file('${
                inbox.get(dis_key).transactionid
              }')"><span class="icon material-icons">download</span>
              </div>
              <div class="card-footer-item" onclick="delete_file('${
                inbox.get(dis_key).transactionid
              }')"><span class="icon material-icons">delete</span>
              </div>
              <div class="card-footer-item" onclick="report_file('${
                inbox.get(dis_key).transactionid
              }')"><span class="icon material-icons">report</span>
              </div>
          </div>
          <div class="has-text-centered">${
            inbox.get(dis_key).ReceivedTime
          }</div>
      </div>
  </div>`;
  }
}

setStartUp();
