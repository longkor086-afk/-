/* KHMER GAME — Top Up Request System V1 */
(function(){
  const packs=[
    {coins:10000,price:0.99,label:"$0.99",id:"coins_10000"},
    {coins:50000,price:4.50,label:"$4.50",id:"coins_50000"},
    {coins:100000,price:8.99,label:"$8.99",id:"coins_100000"},
    {coins:500000,price:30.99,label:"$30.99",id:"coins_500000"}
  ];
  const fmt=n=>Number(n).toLocaleString();
  const modal=html=>{const m=document.getElementById("modal"),c=document.getElementById("modal-content");if(!m||!c)return;c.innerHTML=html;m.classList.add("show");};

  window.openShop=function(){
    const user=window.khmerGameAuth?.getUser?.();
    if(!user){modal(`<h2>🔐 ត្រូវចូលគណនី</h2><p>សូម Login/Register មុនធ្វើ Top Up។</p><button class="primary-btn full-btn" onclick="location.href='account.html'">ចូលគណនី</button>`);return;}
    modal(`<span class="eyebrow">COINS SHOP</span><h2>🪙 ទិញ Coins</h2><p class="modal-muted">ជំហាននេះបង្កើត Top Up Request ប៉ុណ្ណោះ។ មិនទាន់បន្ថែម Coins ទេ។</p><div class="cg-list">${packs.map(p=>`<button class="cg-card" onclick="selectCoinPack(${p.coins},'${p.label}','${p.id}',${p.price})"><span>🪙</span><div><b>${fmt(p.coins)} Coins</b><small>${p.label}</small></div><i>›</i></button>`).join("")}</div>`);
  };

  window.selectCoinPack=function(coins,label,packageId,amount){
    modal(`<h2>🪙 ${fmt(coins)} Coins</h2><p>តម្លៃ <b>${label}</b></p><div class="notice"><b>បង្កើតការស្នើ Top Up</b><p>ប្រព័ន្ធនឹងបង្កើត Transaction ជា <b>pending</b>។ Coins មិនទាន់ចូលគណនីទេ។</p></div><button class="primary-btn full-btn" id="createTopupBtn" onclick="createTopup('${packageId}',${coins},${amount})">📄 បង្កើត Top Up Request</button><button class="primary-btn full-btn" style="margin-top:7px" onclick="openShop()">← ត្រឡប់</button>`);
  };

  window.createTopup=async function(packageId,coins,amount){
    const user=window.khmerGameAuth?.getUser?.(),db=window.khmerGameAuth?.db;
    const btn=document.getElementById("createTopupBtn");
    if(!user||!db){modal(`<h2>🔐 មិនទាន់ចូលគណនី</h2><p>សូម Login ហើយសាកម្ដងទៀត។</p>`);return;}
    if(btn)btn.disabled=true;
    try{
      const ref=await db.collection("transactions").add({
        userId:user.uid,type:"topup",coins:Number(coins),amount:Number(amount),
        status:"pending",packageId:packageId,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      });
      modal(`<h2>✅ ស្នើ Top Up បានហើយ</h2><div class="notice"><b>Transaction កំពុងរង់ចាំ</b><p>លេខសម្គាល់៖ <small>${ref.id}</small></p><p>Coins៖ <b>${fmt(coins)}</b></p><p>តម្លៃ៖ <b>$${Number(amount).toFixed(2)}</b></p><p>Coins <b>មិនទាន់ចូល</b> គណនីទេ រហូតដល់ការបង់ប្រាក់ត្រូវបានបញ្ជាក់ដោយ Server/Admin។</p></div><button class="primary-btn full-btn" onclick="closeModal()">យល់ព្រម</button>`);
    }catch(e){
      console.error(e);
      modal(`<h2>❌ មិនអាចបង្កើត Request</h2><p>${e.code==="permission-denied"?"Firebase Rules មិនអនុញ្ញាត។ សូមពិនិត្យ Rules និង Login។":"មានបញ្ហាក្នុងការភ្ជាប់ Firebase។ សូមសាកម្ដងទៀត។"}</p><button class="primary-btn full-btn" onclick="openShop()">សាកម្ដងទៀត</button>`);
    }finally{if(btn)btn.disabled=false;}
  };
})();
