const bcrypt = require("bcrypt");
const Alert = require("electron-alert");
const saltRounds = 10;

let table = "user_details";

/* TODO Change the entire code to send this data to the private server */
/* TODO Send the data to the server, display the dialog for the pin, after receiveing the pin send this punk to the dashboard*/
/̶*̶ T̶O̶D̶O̶ P̶a̶s̶s̶w̶o̶r̶d̶ m̶i̶s̶m̶a̶t̶c̶h̶ c̶h̶e̶c̶k̶ *̶/̶ 
/* TODO Email verification for Gmail only */
/* TODO use electron alert to the proper places accordingly */

function checkAndWrite() {
    let fullName = document.getElementById("fullName");
    let uniqueUserName = document.getElementById("uniqueUser");
    let password = document.getElementById("password");
    let confirmPassword = document.getElementById("confirmPassword");
    let email = document.getElementById("email");
    let phone = document.getElementById("phone");
    if(password.value == confirmPassword.value)
    {
        
    }
    else{
        //alert for password mismatch
    }
}    