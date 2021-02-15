const instance = axios.create({
    httpsAgent: new https.Agent({  
      rejectUnauthorized: false
    })
  });

function signmeout(){
    const uniq_name = cred_to_rem.get('unique-username')
    if(fs.existsSync('./creds.json')){
        fs.unlink('./creds.json', (err) => {
          if(err) console.log('Failed to Delete Cred file')
        })
    }

    data = {
        'userName':uniq_name
    }

    let stringUserDetails = stringify(data);
    let encryptedDetails = server_pubkey.encrypt(stringUserDetails);
    let hexEnc = Buffer.from(encryptedDetails).toString("hex");
    url = "https://3.131.252.234:8443/api/generalusersignout/" + hexEnc;

    Swal.fire({
        icon: 'info',
        title: '<p style="color:#FFF";>Please Wait</p>',
        width: '350',
        html: '<p style="color:#FFF";>Please wait while we sign you out</p>',
        background: '#000000',
        allowOutsideClick: false,
        showConfirmButton: false
      })

    let response = axiosTest().then(function (data) {
    console.log(data);
    switch (data) {        
        case 'SUCCESS: SIGNED OUT':
            Swal.fire({
                icon: 'success',
                title: '<p style="color:#FFF";>Success</p>',
                width: '350',
                html: '<p style="color:#FFF";>Successfully signed out</p>',
                background: '#000000'
              }).then((result) => {
                window.location.href = "index.html";        
              }).then((result) => {
                return true
              })
        break;

        case 'ERROR: FAILED TO SIGNOUT':
            Swal.fire({
                icon: 'error',
                title: '<p style="color:#FFF";>Error</p>',
                width: '350',
                html: '<p style="color:#FFF";>Failed to sign out, contack helpdesk or try again</p>',
                background: '#000000'
              })
              
        break;
        
    }})
}

function axiosTest() {
    return instance.get(url).then((response) => response.data);
  }
  
