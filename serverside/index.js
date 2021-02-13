const AWS = require("aws-sdk");
const bcrypt = require("bcrypt");
const express = require("express");
const NodeRSA = require("node-rsa");
const { randomInt } = require("crypto");
const https = require('https');
const fs = require('fs')
const app = express();
const { parse, stringify } = require("flatted");
const { send } = require("process");
const s_privkey =
  "\n-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg5pi8GEZ5Z1Ahw3UwQlcq\nQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQJAbWX2oh4UKXeaP6U6FIk8\n0oFMKLEMBWZrDXrP3Y8xlD14KVWJvhqymc8uZWrTVIWAXEIVYaL+Ra1MSSden/Dc\n4QIhAMX6Rk6J8ePJ7xBSE96wxH/KHAkIFVahHc5C6Dw7IJ3HAiEAuexdorUWmx8d\n0Ze4/lUeoSH+ft2MqMyosCuiYsVTfesCIAJoWcSIvu1TPloHdYBmy+z160Nc2s2T\n5gXlIGfjHDFvAiEApPvmq3fes5CNOWxVsPt/zqUH3TRkmXXjS1GtK9DHIjkCIDDJ\nX0qbyublte71pvhecvEOXlOK/RssxvfG9BOXoej2\n-----END RSA PRIVATE KEY-----\n";
const priv_key = new NodeRSA(s_privkey, "pkcs1-private-pem");

AWS.config.update({
  region: "ap-south-1",
});

let docClient = new AWS.DynamoDB.DocumentClient();

let table = "user_details";

function sendSMS(to_number, message, cb) {
  const sns = new AWS.SNS();
  sns.publish(
    {
      Message: message,
      Subject: "Admin",
      PhoneNumber: to_number,
    },
    cb
  );
}

/**sign up */
app.get("/api/generalusersignup/:data", (req, res) => {
  /**
   * * receive and decrypt
   */
  let prepData = Buffer.from(req.params.data, "hex");
  let decryptedData = priv_key.decrypt(prepData); //type is buffer
  let formattedData = decryptedData.toString();
  let finalData = parse(formattedData);
  finalData["OTP"] = Math.floor(100000 + Math.random() * 900000);
  //Code to check if the username already exists
  params = {
    TableName: table,
    Key: {
      userName: finalData["userName"],
    },
  };
  docClient.get(params, (err, data) => {
    if(err){
      sendSMS(
        finalData.phone,
        `Your One Time Password is ${finalData["OTP"]}. Do not Share it with anyone.`,
        (err, result) => {
          console.log("RESULTS: ", err, result);
        }
      );
      /**Enter DB write code here */
      let tableparams = {
        TableName: table,
        Item: finalData,
      };
      docClient.put(tableparams, function (err, data) {
        if (err) {
          console.log("error", err);
        } else {
          console.log("added to db", data);
        }
      });
      res.send("DONE");
    }
    else{
      res.send("UserExists")
    }
  })
});

/**login*/
app.get("/api/generaluserlogin/:data", (req, res) => {
  let prepData = Buffer.from(req.params.data, "hex");
  let decryptedData = priv_key.decrypt(prepData); //type is buffer
  let formattedData = decryptedData.toString();
  let finalData = parse(formattedData);
  params = {
    TableName: table,
    Key: {
      userName: finalData["userName"],
    },
  };
  docClient.get(params, (err, data) => {
    if (err || data.Item.OTPVerified == "false") {
      res.send("Invalid Credentials1");
    } else {
      if (finalData.userName == data.Item.userName) {
        bcrypt.compare(
          finalData.password,
          data.Item.password,
          (err, result) => {
            if (result) {
              //create IAM user and send access code and secret key
              var iam = new AWS.IAM();
              var params = {
                UserName: finalData.userName,
              };
              iam.createUser(params, function (err, data) {
                if (err) console.log("User Creation Error");
              });

              iam.createAccessKey(params, function (err, data) {
                if (err) {
                  console.log("Error in Access Key Creation");
                } else {
                  temps = stringify(data);
                  let temp_encrypted = priv_key.encryptPrivate(temps);
                  let hexEnc = Buffer.from(temp_encrypted).toString("hex");
                  res.send(hexEnc);
                }
              });

              params["GroupName"] = "CNBasicUser";
              iam.addUserToGroup(params, function (err, data) {
                if (err) console.log("Adding to Group Adding");
              });
            } else {
              res.send("Invalid Credentials2");
              console.log(
                `BYE : ${finalData.password} vs ${data.Item.password}`
              );
              //res.send(err)
            }
          }
        );
      } else {
        console.log(`HELLO : ${finalData.userName} vs ${data.Item.userName}`);
        console.log(data);
        res.send("Incorrect Username");
      }
    }
  });
});

/**OTP Verification + Reset */
app.get("/api/generaluserverify/:data/:resendvalue", (req, res) => {
  let prepData = Buffer.from(req.params.data, "hex");
  let decryptedData = priv_key.decrypt(prepData); //type is buffer
  let formattedData = decryptedData.toString();
  let finalData = parse(formattedData);
  let resendvalue = req.params.resendvalue;

  params = {
    TableName: table,
    Key: {
      userName: finalData.userName,
    },
  };

  docClient.get(params, (err, data) => {
    if (err) {
      res.send("Ensure that you have signed up");
    } else {
      if (resendvalue == 1) {
        params = {
          TableName: table,
          Key: {
            userName: data.Item.userName,
          },
          UpdateExpression: "set OTP = :r",
          ExpressionAttributeValues: {
            ":r": Math.floor(100000 + Math.random() * 900000),
          },
          ReturnValues: "UPDATED_NEW",
        };
        docClient.update(params, (err, udata) => {
          if (err) {
            console.log(err);
            res.send("Reset otp error");
          } else {
            res.send("Reset successs");
            sendSMS(
              data.Item.phone,
              `Your One Time Password is ${udata.Attributes.OTP}. Do not Share it with anyone.`,
              (err, result) => {
                console.log("RESULTS: ", err, result);
              }
            );
          }
        });
      } else {
        if (data.Item.OTP == finalData.OTP) {
          res.send("DONE");

          params = {
            TableName: table,
            Key: {
              userName: data.Item.userName,
            },
            UpdateExpression: "set OTPVerified = :r",
            ExpressionAttributeValues: {
              ":r":'true'
            },
            ReturnValues: "UPDATED_NEW",
          };
          docClient.update(params, (err, udata) => {
            if (err) {
              console.log("OTPVerified status update failed");
            } else {
              console.log("OTPVerified Status updated");
            }
          });
        } else {
          console.log(data.Item.OTP, " vs ", finalData.OTP);
          res.send("Invalid OTP");
        }
      }
    }
  });
});


var privateKey  = fs.readFileSync('cert/server.key', 'utf8');
var certificate = fs.readFileSync('cert/server.cert', 'utf8');
var credentials = {key: privateKey, cert: certificate};

var httpsServer = https.createServer(credentials, app);

httpsServer.listen('8443')
