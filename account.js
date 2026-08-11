let currentMode="login";
function mode(m,b){currentMode=m;document.querySelectorAll(".tabs button").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.getElementById("name").style.display=m==="register"?"block":"none";document.getElementById("name").required=m==="register";document.getElementById("submit").textContent=m==="register"?"បង្កើតគណនី":"ចូលគណនី";document.getElementById("password").autocomplete=m==="register"?"new-password":"current-password";document.getElementById("msg").textContent=""}
function submitAuth(e){e.preventDefault();const msg=document.getElementById("msg");msg.textContent="UI រួចរាល់។ ត្រូវភ្ជាប់ Firebase Config និង Firebase Authentication ដើម្បីដំណើរការគណនីពិត។";msg.className="info"}
function guest(){localStorage.setItem("khmerGameGuest","1");location.href="../index.html"}
mode("login",document.querySelector(".tabs button"));
