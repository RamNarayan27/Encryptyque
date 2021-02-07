const fs = require("fs");
const path = './creds.json'

function redirect(){
    
    try{
        if(fs.existsSync(path)){
            //file exists
            window.location.href = "mainwindow.html";
        }
        else{
            //file doesn't exist
            window.location.href = "index.html";
        }
    } catch(err){
        console.log(err)
    }
}
