const AWS = require("aws-sdk");
const bcrypt = require("bcrypt");
const dataStore = require("data-store")({path: process.cwd() + '/creds.json'});

AWS.config.update({
    region: "ap-south-1"
});

let docClient = new AWS.DynamoDB.DocumentClient();

let table = "user_details";

function readAndValidate(){
    let hashedPassword = "";
    let userName = document.getElementById("username");
    let password = document.getElementById("password");
    let params = {
        TableName: table,
        Key:{
            "userName": userName.value
        }
    };
    docClient.get(params,(err,data) => {
        if(Object.keys(data).length == 0){
            /* TODO Custom Alert Message for username doesn't exist*/
        }
        else{
           hashedPassword = data.Item.info.password;
           bcrypt.compare(password.value,hashedPassword,function(err, result){
               if(result){
                /* TODO create a file and to store the user creds!*/
                dataStore.set('username', userName.value);
                dataStore.set('password', hashedPassword);

                window.location.href = "mainwindow.html";
               }
               else{
                /* TODO Custom Alert Message for Password Mismatch*/
               }
           });
        }
    })
}