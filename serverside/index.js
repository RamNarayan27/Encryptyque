const AWS = require("aws-sdk");
const bcrypt = require("bcrypt");
const express = require("express");
const NodeRSA = require("node-rsa");
const { randomInt } = require("crypto");
const https = require("https");
const http = require("http");
const fs = require("fs");
const app = express();
const { parse, stringify } = require("flatted");

const s_privkey =
  "\n-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAI/Ip/FSDW2ZQfUSfbrFJrVx95crrvUg5pi8GEZ5Z1Ahw3UwQlcq\nQqPlC0FKDcWSvDk1Md7wpk5/PpkxVH6AAK0CAwEAAQJAbWX2oh4UKXeaP6U6FIk8\n0oFMKLEMBWZrDXrP3Y8xlD14KVWJvhqymc8uZWrTVIWAXEIVYaL+Ra1MSSden/Dc\n4QIhAMX6Rk6J8ePJ7xBSE96wxH/KHAkIFVahHc5C6Dw7IJ3HAiEAuexdorUWmx8d\n0Ze4/lUeoSH+ft2MqMyosCuiYsVTfesCIAJoWcSIvu1TPloHdYBmy+z160Nc2s2T\n5gXlIGfjHDFvAiEApPvmq3fes5CNOWxVsPt/zqUH3TRkmXXjS1GtK9DHIjkCIDDJ\nX0qbyublte71pvhecvEOXlOK/RssxvfG9BOXoej2\n-----END RSA PRIVATE KEY-----\n";
const priv_key = new NodeRSA(s_privkey, "pkcs1-private-pem");

AWS.config.update({
  region: "ap-south-1",
  accessKeyId: "AKIAQNYSRWDVTHC4LSW3",
  secretAccessKey: "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",
});

const privateKey = fs.readFileSync("cert/server.key", "utf8");
const certificate = fs.readFileSync("cert/server.cert", "utf8");
const credentials = { key: privateKey, cert: certificate };
const docClient = new AWS.DynamoDB.DocumentClient();
const table = "user_details";

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

  //Code to check if the username already exists
  params = {
    TableName: table,
    Key: {
      userName: finalData["userName"],
    },
  };
  docClient.get(params, (err, data) => {
    try{
      x = Object.entries(data).length
    }
    catch{
      res.send('ERROR: CHECK DETAILS')
    }
    if (Object.entries(data).length == 0) {
      //User Doesnt exist
      finalData["OTP"] = Math.floor(100000 + Math.random() * 900000);
      sendSMS(
        finalData.phone,
        `Your One Time Password is ${finalData["OTP"]}. Do not Share it with anyone.`,
        (err, result) => {
          if (err) {
            console.log("Internal Error: Failed To Send OTP");
          } else {
            console.log("Log: Successfully Sent OTP");
          }
        }
      );
      /**Enter DB write code here */
      let tableparams = {
        TableName: table,
        Item: finalData,
      };
      docClient.put(tableparams, function (err, data) {
        if (err) {
          console.log("Internal Error: Failed to Create user");
        } else {
          console.log("Log: Successfully created user");
        }
      });
      res.send("SUCCESS: USER CREATION");
    } else {
      res.send("ERROR: USER EXISTS");
    }
  });
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
    if (Object.entries(data).length == 0 || data.Item.OTPVerified == "false") {
      res.send("ERROR: INVALID USERNAME/PASSWORD");
      console.log("Log: otp not verified/user doesnt exist");
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
              iam.createUser(params, function (err, cdata) {
                if (err) {
                  console.log("Log: User tried to login from difference device");
                  res.send('ERROR: ERROR: ALREADY LOGGED IN')
                } else {
                  iam.createAccessKey(params, function (err, udata) {
                    if (err) {
                      console.log("Log: Possible AccessKey Creation Error");
                    } else {
                      udata["fullname"] = data.Item.fullName;
                      temps = stringify(udata);
                      let temp_encrypted = priv_key.encryptPrivate(temps);
                      let hexEnc = Buffer.from(temp_encrypted).toString("hex");
                      console.log("Log: Successfully sent AccessCodes");
                      res.send(hexEnc);

                      params["GroupName"] = "CNBasicUser";
                      iam.addUserToGroup(params, function (err, data) {
                        if (err) {
                          console.log(
                            "Log: Possible Error in Adding User to Group"
                          );
                        }
                      });
                    }
                  });
                }
              });
            } else {
              res.send("ERROR: INVALID USERNAME/PASSWORD");
              console.log(
                `Log : ${finalData.password} compared to ${data.Item.password} failure`
              );
            }
          }
        );
      } else {
        console.log(
          `Log: ${finalData.userName} compared to ${data.Item.userName} - failure`
        );
        res.send("ERROR: INVALID USERNAME/PASSWORD");
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
      console.log(
        "Internal Error: Error fetching user details (Waiting for retry)"
      );
      res.send("ERROR: INVALID USERNAME/PASSWORD");
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
            console.log("Internal Error: Error Resetting OTP");
            res.send("ERROR: UNABLE TO RESET OTP");
          } else {
            sendSMS(
              data.Item.phone,
              `Your One Time Password is ${udata.Attributes.OTP}. Do not Share it with anyone.`,
              (err, result) => {
                if (err) {
                  console.log("Internal Error: Unable to Send SMS");
                } else {
                  console.log("Log: Successfully Sent New SMS");
                }
              }
            );
            res.send("SUCCESS: OTP RESET");
          }
        });
      } else {
        if (data.Item.OTP == finalData.OTP) {
          res.send("SUCCESS: OTP VERIFIED");

          params = {
            TableName: table,
            Key: {
              userName: data.Item.userName,
            },
            UpdateExpression: "set OTPVerified = :r",
            ExpressionAttributeValues: {
              ":r": "true",
            },
            ReturnValues: "UPDATED_NEW",
          };
          docClient.update(params, (err, udata) => {
            if (err) {
              console.log("Internal Error: OTPVerified status update failed");
            } else {
              console.log("Log: OTPVerified Status updated");
            }
          });
        } else {
          console.log(
            `Log: ${data.Item.OTP} compared to ${finalData.OTP} : Mismatch`
          );
          res.send("ERROR: OTP MISMATCH");
        }
      }
    }
  });
});

app.get("/api/generalusersignout/:data", (req,res) => {

  let prepData = Buffer.from(req.params.data, "hex");
  let decryptedData = priv_key.decrypt(prepData); //type is buffer
  let formattedData = decryptedData.toString();
  let finalData = parse(formattedData);
  var iam = new AWS.IAM();

  var grp_params = {
  UserName: finalData["userName"],
  GroupName: 'CNBasicUser'
  };
  var params = {
  UserName: finalData["userName"]
  };

   iam.removeUserFromGroup(grp_params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else {
      console.log('SUCCESS: Deleted user from group'); // successful response
      iam.listAccessKeys(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
          temp_param = {
            AccessKeyId : data.AccessKeyMetadata[0].AccessKeyId,
            UserName : finalData["userName"]
          }
          iam.deleteAccessKey(temp_param, function(err, data) {
            if (err) console.log('Internal Error: Failed to delete access key', err.stack);
            else{
              console.log('Success: Deleted Access Keys');
              iam.deleteUser(params, function(err, data) {
                if (err) {
                  console.log('Internal Error: Failed to Delete Account',err)
                  res.send('ERROR: FAILED TO SIGNOUT');
                }
                else
                {
                  console.log('SUCCESS: Deleted user account')
                  res.send('SUCCESS: SIGNED OUT');
                }
              });
            }
          });
        }})
    
    
    
    }
  });

  



})
const httpsServer = https.createServer(credentials, app);
const httpserver = http.createServer(app);

httpsServer.listen("8443");
//httpserver.listen('5500') Fully Transitioned to HTTPS Server
