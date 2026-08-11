let currentMode = "login";

function mode(m, button){
  currentMode = m;

  document.querySelectorAll(".tabs button")
    .forEach(x => x.classList.remove("active"));

  button.classList.add("active");

  const name = document.getElementById("name");
  name.style.display = m === "register" ? "block" : "none";
  name.required = m === "register";

  document.getElementById("submit").textContent =
    m === "register" ? "បង្កើតគណនី" : "ចូលគណនី";

  document.getElementById("msg").textContent = "";
}

function showMsg(text, type){
  const msg = document.getElementById("msg");
  msg.textContent = text;
  msg.className = type || "";
}

async function submitAuth(event){
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const name = document.getElementById("name").value.trim();
  const button = document.getElementById("submit");

  if(!window.khmerGameAuth?.auth){
    showMsg("Firebase មិនទាន់ភ្ជាប់។ សូម Refresh ទំព័រ ហើយសាកម្ដងទៀត។", "error");
    return;
  }

  button.disabled = true;

  try{
    if(currentMode === "register"){
      if(name.length < 2)
        throw new Error("សូមបញ្ចូលឈ្មោះអ្នកលេង។");

      if(password.length < 6)
        throw new Error("ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។");

      const result =
        await window.khmerGameAuth.auth
          .createUserWithEmailAndPassword(email, password);

      await result.user.updateProfile({
        displayName: name
      });

      // Create the Firestore profile immediately after registration.
      await window.khmerGameAuth.ensureUserProfile(result.user);

      showMsg("✅ បង្កើតគណនី និង Profile ជោគជ័យ! 5,000៛ ត្រូវបានផ្តល់ជូន។", "success");
    }else{
      await window.khmerGameAuth.auth
        .signInWithEmailAndPassword(email, password);

      // If an older account has no Firestore profile, create it now.
      const user = window.khmerGameAuth.auth.currentUser;
      await window.khmerGameAuth.ensureUserProfile(user);

      showMsg("✅ ចូលគណនីជោគជ័យ!", "success");
    }

    setTimeout(() => {
      location.href = "index.html";
    }, 900);

  }catch(error){
    console.error(error);

    let text = "មានបញ្ហា។ សូមសាកម្ដងទៀត។";

    if(error.code === "auth/email-already-in-use")
      text = "អ៊ីមែលនេះមានគណនីរួចហើយ។ សូមចូលគណនី។";
    else if(error.code === "auth/invalid-email")
      text = "អ៊ីមែលមិនត្រឹមត្រូវ។";
    else if(error.code === "auth/weak-password")
      text = "ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ 6 តួអក្សរ។";
    else if(error.code === "auth/invalid-credential" ||
            error.code === "auth/wrong-password")
      text = "អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ។";
    else if(!error.code && error.message)
      text = error.message;
    else if(error.code === "permission-denied")
      text = "Firebase Rules មិនអនុញ្ញាតឱ្យបង្កើត Profile។ សូមពិនិត្យ Firestore Rules។";

    showMsg(text, "error");
  }finally{
    button.disabled = false;
  }
}

function guest(){
  localStorage.setItem("khmerGameGuest", "1");
  location.href = "index.html";
}

mode("login", document.querySelector(".tabs button"));
