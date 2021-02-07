const AWS = require("aws-sdk");
const bcrypt = require("bcrypt");
const saltRounds = 10;

AWS.config.update({
    region: "ap-south-1"
});

let docClient = new AWS.DynamoDB.DocumentClient();

let table = "user_details";

function checkAndWrite() {
    let fullName = document.getElementById("fullName");
    let uniqueUserName = document.getElementById("uniqueUser");
    let password = document.getElementById("password");
    let confirmPassword = document.getElementById("confirmPassword");
    let email = document.getElementById("email");
    let phone = document.getElementById("phone");
    var tableparams = {
        TableName: table,
        Key: {
            "userName": uniqueUserName.value
        }
    };
    docClient.get(tableparams, (err, data) => {
        if (Object.keys(data).length == 0) {
            if (String(password.value) == String(confirmPassword.value)) {
                bcrypt.hash(password.value, saltRounds).then(function (hash) {
                    writeToDynamoDB(String(fullName.value), String(uniqueUserName.value), String(hash), String(email.value), String(phone.value));
                    fullName.value = "";
                    uniqueUserName.value = "";
                    password.value = "";
                    confirmPassword.value = "";
                    email.value = "";
                    phone.value = "";
                })
            }
            else {
                /* TODO Custom Alert for Password Mismatch*/
            }
        }
        else {
            /* TODO Custom Alert for Username already exists */
        }
    });
}

function writeToDynamoDB(fullname, uniqueUserName, hash, email, phone) {
    let params = {
        TableName: table,
        Item: {
            "userName": uniqueUserName,
            "email": email,
            "info": {
                "phone-number": phone,
                "name": fullname,
                "password": hash
            }
        }
    };

    /* TODO Start Loading screen */
    docClient.put(params, function (err, data) {
        if (err) {
            /* TODO Fatal Error Alert*/
        } else {
            alert("added to db");
            /* TODO Close loading screen */
            window.location.href = "mainwindow.html";
        }
    });
}

/* TODO Function for Loading Screen */
/* TODO Custom Alert Box */