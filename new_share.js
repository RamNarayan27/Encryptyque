
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
const fileDialog = require('file-dialog')
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
const autocomplete = require('autocompleter');
const Base64 = require("js-base64");
const { callbackify } = require("util");
const notifier = require("node-notifier");
const Swal = require('sweetalert2')
const path = require("path");
const randomstring = require("randomstring");
const axios = require('axios');
const { resolve } = require("path");

let file_count = 1
let file_col = document.getElementById('filenames')

const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

prm_ary = []
cred_details = cred.get("creds");
let prepData = Buffer.from(cred_details, "hex");
let decryptedData = server_pubkey.decryptPublic(prepData);
let formattedData = decryptedData.toString();
let finalData = parse(formattedData);

accesskey = finalData.AccessKey.AccessKeyId;
secretkey = finalData.AccessKey.SecretAccessKey;

rec_string = document.getElementById('recipient_list')
const fren_list = fs.readFileSync("friend_list.json");
const fren_data = JSON.parse(fren_list);
const final_fren_list = Object.keys(fren_data);
autocomplete_fren_list = []
for(let fren of final_fren_list){
  temp_ob = {
    label:fren
  }
  autocomplete_fren_list.push(temp_ob)
}

function setProfilePicture() {
  profilePicture = document.getElementById('profile-picture');
  fileDialog().then((file) => {
    fs.readFile(file[0].path, function (err, original_data) {
      // This tells node to take that buffer, and write it to the new filename.
      // Again no encoding is provided, so it will assume a Buffer or utf8 string.
      fs.writeFile("img.jpg", original_data, function (err) {});
    });
    profilePicture.src = 'img.jpg';
  });
}

let txtlen = 0
autocomplete({
  input: rec_string,
  fetch: function(text, update) {
      text = text.toLowerCase().split(',')[text.toLowerCase().split(',').length -1].replaceAll(' ','');
      //console.log(text)
      txtlen = text.length
      // you can also use AJAX requests instead of preloaded data
      var suggestions = autocomplete_fren_list.filter(n => n.label.toLowerCase().startsWith(text))
      //console.log('suggestion: ',suggestions)
      update(suggestions);
  },
  onSelect: function(item) {
      rec_string.value = rec_string.value.slice(0,0-txtlen)
      rec_string.value += item.label;
  }
});
setStartUp();

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
async function new_tobase64(filelocation) {
  const obj = file_manager.readFileSync(filelocation ,'binary')
  return Base64.btoa(obj); // ENCODING
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
  file_count = 1
  file_col.innerHTML = ''
}

// A simple function to prepare the file for uploading
async function file_prepare(file, recipient_list) {
  console.log(file,recipient_list)
  let prep_promise = new Promise(function (resolve, reject) {
    encoded_promise = new_tobase64(file);
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
            else {
              console.log("Sent to Outbox!");
              resolve('Sent')
            }
          }
        );
        return result;
      });
  });
  return prep_promise
}

confirm_prm_array = []
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
        resolve(1)
      }
    });
    confirm_prm_array.push(file_upload_promise)
  }
}

async function select_file_button(){
  final_recipient_list = rec_string.value.replaceAll(' ','').split(',')
  fileDialog({multiple: true})
    .then(file => {
        if(file.length > 4 || file_count >4){
          Swal.fire({
            icon: 'error',
            title: '<p style="color:#FFF";>Error</p>',
            width: '350',
            html: '<p style="color:#FFF";>Please Choose only upto 4 files</p>',
            background: '#000000',
            allowOutsideClick: true,
            showConfirmButton: true
          })
        }
        else if(final_recipient_list[0] == ""){
          Swal.fire({
            icon: 'error',
            title: '<p style="color:#FFF";>Error</p>',
            width: '350',
            html: '<p style="color:#FFF";>Please Enter the recipient first</p>',
            background: '#000000',
            allowOutsideClick: true,
            showConfirmButton: true
          })
        }
        else{
          file_count += file.length
          for(let count=0;count<file.length;count++){
            file_col.innerHTML += `<div class="column is-half">
            <div class="card">
                <div class="card-content has-text-centered">
                    ${file[count].name}
                </div>
            </div>
        </div>`
          }
          //console.log(file)
          for(let count=0;count<file.length;count++){
            prm_ary.push(file_prepare(file[count].path,final_recipient_list))
          }
          console.log(prm_ary)
        }

    })
}
async function send_button() {

  Swal.fire({
    icon: 'info',
    title: '<p style="color:#FFF";>Wait</p>',
    width: '350',
    html: '<p style="color:#FFF";>Please Wait while your files are being encrypted</p>',
    background: '#000000',
    allowOutsideClick: false,
  })

  all_encrypted = true
  while(all_encrypted == true){
    for(let i =0;i<prm_ary.length;i++){
      if(prm_ary[i].PromiseState !== "fulfilled"){
        all_encrypted = false
      }
    }
  }
  console.log(all_encrypted)
  
  Swal.fire({
    icon: 'success',
    title: '<p style="color:#FFF";>success</p>',
    width: '350',
    html: '<p style="color:#FFF";>Your Files are Successfully encrypted</p>',
    background: '#000000',
    allowOutsideClick: false,
    showConfirmButton: true
  }).then((result) =>{
    if (result.isConfirmed) {
      Swal.fire({
        icon: 'info',
        title: '<p style="color:#FFF";>Uploading</p>',
        width: '350',
        html: '<p style="color:#FFF";>Your Files Are Uploading and will be sent soon</p>',
        background: '#000000',
        allowOutsideClick: false,
        showConfirmButton: true
      })
    }
  })
  send_file()
  all_uploaded = true
  while(all_uploaded == true){
    for(let i =0;i<confirm_prm_array.length;i++){
      if(confirm_prm_array[i].PromiseState !== "fulfilled"){
        all_uploaded = false
      }
    }
  }
  Swal.fire({
    icon: 'success',
    title: '<p style="color:#FFF";>Successfully Uploaded</p>',
    width: '350',
    html: '<p style="color:#FFF";>Your Files have been uploaded</p>',
    background: '#000000',
    allowOutsideClick: true,
    showConfirmButton: true
  }).then((result) => {
    discard_share()
  })

  //console.log(rec_data)
  //console.log(len)
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

function setStartUp(){
  const profilePicture = document.getElementById("profile-picture");
  const userFullName = document.getElementById("user-fn");
  const userId = document.getElementById("user-id");
  const quotes = document.getElementById("quotes");
  const inbox_html = document.getElementById("inbox");

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
}