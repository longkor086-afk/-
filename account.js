let currentMode="login";
function mode(m,b){
 currentMode=m;document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 const n=document.getElementById("name");n.style.display=m==="register"?"block":"none";n.required=m==="register";
 document.getElementById("submit").textContent=m==="register"?"បង្កើតគណនី":"ចូលគណនី";
 document.getElementById("password").autocomplete=m==="register"?"new-password":"current-password";document.getElementById("msg").textContent="";
}
function showMsg(t,c="info"){const m=document.getElementById("msg");m.textContent=t;m.className=c;}
async function submitAuth(e){
 e.preventDefault();const email=document.getElementById("email").value.trim(),password=document.getElementById("password").value,name=document.getElementById("name").value.trim(),btn=document.getElementById("submit");
 if(!window.khmerGameAuth?.auth){showMsg("មិនទាន់ភ្ជាប់ Firebase ទេ។ សូម Refresh ម្តងទៀត។","error");return;}
 btn.disabled=true;
 try{
  if(currentMode==="register"){
   if(name.length<2)throw new Error("សូមបញ្ចូលឈ្មោះអ្នកលេង។");
   if(password.length<6)throw new Error("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។");
   const r=await khmerGameAuth.auth.createUserWithEmailAndPassword(email,password);
   await r.user.updateProfile({displayName:name});showMsg("បង្កើតគណនីជោគជ័យ!","success");
  }else{await khmerGameAuth.auth.signInWithEmailAndPassword(email,password);showMsg("ចូលគណនីជោគជ័យ!","success");}
  setTimeout(()=>location.href="index.html",500);
 }catch(err){
  let t="មានបញ្ហា។ សូមពិនិត្យអ៊ីមែល និងពាក្យសម្ងាត់។";
  if(err.code==="auth/email-already-in-use")t="អ៊ីមែលនេះមានគណនីរួចហើយ។";
  else if(err.code==="auth/invalid-email")t="អ៊ីមែលមិនត្រឹមត្រូវ។";
  else if(err.code==="auth/weak-password")t="ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។";
  else if(err.code==="auth/invalid-credential"||err.code==="auth/wrong-password")t="អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។";
  else if(!err.code&&err.message)t=err.message;
  showMsg(t,"error");
 }finally{btn.disabled=false;}
}
function guest(){localStorage.setItem("khmerGameGuest","1");location.href="index.html";}
mode("login",document.querySelector(".tabs button"));