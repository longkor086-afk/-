// Add Firebase scripts before this file:
// firebase-app-compat.js, firebase-auth-compat.js, firebase-config.js, auth.js
async function logout(){
 try{await window.khmerGameAuth.auth.signOut();showPage("profile");}
 catch(e){alert("មិនអាចចាកចេញបានទេ។");}
}