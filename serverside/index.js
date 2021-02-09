const AWS = require("aws-sdk");
const bcyprt = require("bcrypt");
const express = require("express");
const NodeRSA = require("node-rsa");
const { randomInt } = require("crypto");
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

/**sign up
 * TODO DONE
 */
app.get("/api/generalusersignup/:data", (req, res) => {
  /**
   * * receive and decrypt
   */
  let prepData = Buffer.from(req.params.data, "hex");
  let decryptedData = priv_key.decrypt(prepData); //type is buffer
  let formattedData = decryptedData.toString();
  let finalData = parse(formattedData);
  finalData["OTP"] = Math.floor(100000 + Math.random() * 900000);
  sendSMS(
    finalData.phone,
    `Your One Time Password is ${finalData["OTP"]}`,
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
});

/**login
 * ! requires db read
 */

let testArr = { name: "ram", email: "ram@gmail.com" };
app.get("/api/generaluserlogin/:data", (req, res) => {
  let prepData = Buffer.from(req.params.data, "hex");
  let decryptedData = priv_key.decrypt(prepData); //type is buffer
  let formattedData = decryptedData.toString();
  let finalData = parse(formattedData);
  params = {
    TableName: table,
    Key: {
      username: finalData[userName]
    },
  };
  docClient.get(params, (err,data) => {
      if(err) {
          res.send("Invalid Credentials");
      } else {
          if(finalData.userName == data.userName){
              bcrypt.compare(finalData.password,data.password,(err, result) => {
                if(result) {
                    //create IAM user and send access code and secret key
                    var iam = new AWS.IAM();
                    var params = {
                        UserName: finalData.userName,
                      };
                      iam.createUser(params, function (err, data) {
                        if (err) res.send("User Creation Error");
                        // an error occurred
                     // successful response
                      });
                      
                      iam.createAccessKey(params, function (err, data) {
                        if (err) res.send("Access Key Creation Error");
                        // an error occurred
                        else res.send(data); // successful response
                      });
                      
                      params["GroupName"] = "CNBasicUser";
                      iam.addUserToGroup(params, function (err, data) {
                        if (err) res.send("Adding to grp error");
                        // an error occurred
                        
                      });
                      
                } else {
                    res.send("Invalid Credentials");
                }
              });
          }
      }
  })
});

/**password verify */
app.get("/api/generaluserverify/:username/:otp/:resendvalue", (req, res) => {
  let otp = req.params.otp;
  let username = req.params.username;
  let resendvalue = req.params.resendvalue;
  params = {
    TableName: table,
    Key: {
      username: username,
    },
  };

  docClient.get(params, (err, data) => {
    if (err) {
      res.send("Ensure that you have signed up");
    } else {
      if (resendvalue == 1) {
        data.Item.OTP = randomInt(6);
        params = {
          TableName: table,
          Key: {
            userName: uname,
          },
          UpdateExpression: "set OTP = :r",
          ExpressionAttributeValues: {
            ":r": randomInt(6),
          },
          ReturnValues: "UPDATED_OTP",
        };
        docClient.update(params, (err, udata) => {
          if (err) {
            res.send("Resend otp error");
          } else {
            res.send("Resend successs");
            sendSMS(
              data.phone,
              `Your One Time Password is ${udata.Attributes.OTP}`,
              (err, result) => {
                console.log("RESULTS: ", err, result);
              }
            );
          }
        });
      } else {
        if (data.Item.OTP == otp) {
          res.send("DONE");
        } else {
          res.send("Invalid OTP");
        }
      }
    }
  });
});

const PORT = 5000;

app.listen(PORT);
