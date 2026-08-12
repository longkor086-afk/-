let currentMode="login";
function mode(m,b){currentMode=m;document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");const n=document.getElementById("name");n.style.display=m==="register"?"block":"none";n.required=m==="register";document.getElementById("submit").textContent=m==="register"?"បង្កើតគណនី":"ចូលគណនី";document.getElementById("msg").textContent=""}
function showMsg(t,type){const m=document.getElementById("msg");m.textContent=t;m.className=type||""}
async function submitAuth(e){
 e.preventDefault();const email=document.getElementById("email").value.trim(),password=document.getElementById("password").value,name=document.getElementById("name").value.trim(),b=document.getElementById("submit");
 if(!window.khmerGameAuth?.auth){showMsg("Firebase មិនទាន់ភ្ជាប់។ សូម Refresh។","error");return} b.disabled=true;
 try{if(currentMode==="register"){if(name.length<2)throw new Error("សូមបញ្ចូលឈ្មោះអ្នកលេង។");if(password.length<6)throw new Error("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។");const r=await khmerGameAuth.auth.createUserWithEmailAndPassword(email,password);await r.user.updateProfile({displayName:name});await khmerGameAuth.ensureUserProfile(r.user);showMsg("✅ បង្កើតគណនី និង Profile ជោគជ័យ!","success")}else{await khmerGameAuth.auth.signInWithEmailAndPassword(email,password);await khmerGameAuth.ensureUserProfile(khmerGameAuth.auth.currentUser);showMsg("✅ ចូលគណនីជោគជ័យ!","success")}setTimeout(()=>location.href="index.html",900)}
 catch(err){console.error(err);let t=err.message||"មានបញ្ហា។ សូមសាកម្ដងទៀត។";if(err.code==="auth/email-already-in-use")t="អ៊ីមែលនេះមានគណនីរួចហើយ។";if(err.code==="auth/invalid-credential"||err.code==="auth/wrong-password")t="អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។";showMsg(t,"error")}finally{b.disabled=false}
}
function guest(){localStorage.setItem("khmerGameGuest","1");location.href="index.html"}
mode("login",document.querySelector(".tabs button"));
