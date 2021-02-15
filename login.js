const axios = require("axios");
const NodeRSA = require("node-rsa");
const { parse, stringify } = require("flatted");
const dataStore = require("data-store")({
  path: process.cwd() + "/creds.json",
});
const Swal = require('sweetalert2')
const https = require("https");
const fs = require('fs');


/**
 * T̶O̶D̶O̶ E̶n̶c̶r̶y̶p̶t̶ a̶n̶d̶ s̶e̶n̶d̶ t̶h̶e̶ u̶s̶e̶r̶n̶a̶m̶e̶ a̶n̶d̶ p̶a̶s̶s̶w̶o̶r̶d̶ f̶i̶e̶l̶d̶s̶ t̶o̶ t̶h̶e̶ a̶p̶i̶ e̶n̶d̶p̶o̶i̶n̶t̶
 * T̶O̶D̶O̶ S̶e̶t̶ A̶l̶e̶r̶t̶s̶ b̶a̶s̶e̶d̶ o̶n̶ t̶h̶e̶ r̶e̶s̶p̶o̶n̶s̶e̶s̶ t̶h̶a̶t̶ y̶o̶u̶ r̶e̶c̶e̶i̶v̶e̶
 * T̶O̶D̶O̶ S̶a̶v̶e̶ t̶h̶e̶ A̶c̶c̶e̶s̶s̶ K̶e̶y̶ a̶n̶d̶ S̶e̶c̶r̶e̶t̶ A̶c̶c̶e̶s̶s̶ C̶o̶d̶e̶
 */

const instance = axios.create({
  httpsAgent: new https.Agent({  
    rejectUnauthorized: false
  })
});


const server_public_key =
  "\n-----BEGIN PUBLIC KEY-----\nMFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg\n5pi8GEZ5Z1Ahw3UwQlcqQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQ==\n-----END PUBLIC KEY-----\n";
const server_pubkey = NodeRSA(server_public_key, "pkcs8-public-pem");

let url = ''


function readAndValidate() {
  let userName = document.getElementById("username");
  let password = document.getElementById("password");
  userLoginInfo = {
    userName: userName.value,
    password: password.value,
  };
  let stringUserDetails = stringify(userLoginInfo);
  let encryptedDetails = server_pubkey.encrypt(stringUserDetails);
  let hexEnc = Buffer.from(encryptedDetails).toString("hex");
  url = "https://3.131.252.234:8443/api/generaluserlogin/" + hexEnc;
  Swal.fire({
    icon: 'info',
    title: '<p style="color:#FFF";>Please Wait</p>',
    width: '350',
    html: '<p style="color:#FFF";>Please wait while we try to log you in</p>',
    background: '#000000',
    allowOutsideClick: false,
    showConfirmButton: false
  })

  let response = axiosTest().then(function (data) {
    switch (data) {
      case 'ERROR: INVALID USERNAME/PASSWORD':
        Swal.fire({
          icon: 'error',
          title: '<p style="color:#FFF";>Invalid Username/Password</p>',
          width: '350',
          html: '<p style="color:#FFF";>Please check the username/password</p>',
          background: '#000000'
        })
        break;

      default:
        Swal.fire({
          icon: 'success',
          title: '<p style="color:#FFF";>Success</p>',
          width: '350',
          html: '<p style="color:#FFF";>Successfully logged in, Setting up your credentials</p>',
          background: '#000000'
        }).then((result) =>{
          dataStore.set('unique-username',userName.value)
          dataStore.set('fullname',data['fullname'])
          dataStore.set('creds',data);
          //redirect to mainwindow.html
          window.location.href = "mainwindow.html";        
        })
        
        break;
    }
  });
}

function axiosTest() {
  return instance.get(url).then((response) => response.data);
}
