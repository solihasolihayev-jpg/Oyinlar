const socket=io();
const $=id=>document.getElementById(id);
const games=[
["🏎️","Knowledge Race","To‘g‘ri javob bilan marraga yugur"],
["☁️","Sky Islands","Orollardan yuqoriga ko‘taril"],
["👑","Knowledge Royale","Har raundda omon qol"],
["🗝️","Treasure Hunt","Xazina kalitlarini top"],
["🐉","Boss Battle","Bossga jamoaviy zarar yetkaz"],
["⚡","Laser Quiz","Lazerli arenada sinov"],
["🧠","Memory Matrix","Xotira juftliklarini top"],
["🧩","Puzzle Factory","Parchalarni birlashtir"],
["⚔️","Duel Arena","Yuzma-yuz bilim dueli"],
["🛡️","Team Clash","Jamoa bilan nuqtalarni egalla"],
["🚪","Escape Room","Kodlarni yechib qoch"],
["🔥","Rapid Fire","Tezkor savollar zanjiri"],
["📐","Sorting Challenge","Elementlarni tartibla"],
["🔗","Connect the Dots","Tushunchalarni bog‘la"],
["🎁","Mystery Box","Sirli topshiriqni och"],
["💎","Auction of Knowledge","Bilimingga virtual ball tik"],
["🎙️","Debate Arena","Dalil bilan fikringni himoya qil"],
["🕵️","Detective Academy","Dalillardan xulosa chiqar"],
["🏰","Survival Tower","Bilim minorasiga ko‘taril"],
["🥇","Grand Championship","Yakuniy ko‘p bosqichli turnir"]
];
const gameAura=["race","sky","royale","treasure","boss","laser","memory","puzzle","duel","team","escape","rapid","sorting","connect","mystery","auction","debate","detective","tower","championship"];
let room=null,playerId=null,selectedGame=0,questions=[],currentQuestion=null,timerHandle=null,secondsLeft=20,answered=false,isHost=false;
const avatarChoices=["🧑‍🚀","👩‍🎓","🧑‍🎓","🦊","🐼","🤖","🧙","🦄"];
function renderGames(){ $("games").innerHTML=games.map((g,i)=>`<button class="game-card ${i===selectedGame?"selected":""}" data-game="${i}"><span class="game-icon">${g[0]}</span><span><strong>${String(i+1).padStart(2,"0")} · ${g[1]}</strong><small>${g[2]}</small></span></button>`).join("");document.querySelectorAll("[data-game]").forEach(b=>b.onclick=()=>{selectedGame=Number(b.dataset.game);renderGames();if(room)socket.emit("room:configure",{game:selectedGame});});}
renderGames();
function show(id){["home","lobby","arena","results"].forEach(x=>$(x).classList.toggle("hidden",x!==id));}
function nameValue(){return $("playerName").value.trim()||"Mehmon"+Math.floor(Math.random()*99);}
function setNotice(t){$("notice").textContent=t||"";}
$("createBtn").onclick=()=>{setNotice("");socket.emit("room:create",{name:nameValue(),avatar:avatarChoices[Math.floor(Math.random()*avatarChoices.length)],game:selectedGame},res=>{if(!res?.ok)return setNotice(res?.error||"Xona yaratilmadi");acceptRoom(res);});};
$("joinBtn").onclick=()=>{setNotice("");socket.emit("room:join",{name:nameValue(),avatar:avatarChoices[Math.floor(Math.random()*avatarChoices.length)],code:$("roomCode").value},res=>{if(!res?.ok)return setNotice(res?.error||"Xonaga qo‘shilib bo‘lmadi");acceptRoom(res);});};
function acceptRoom(res){room=res.room;playerId=res.playerId;isHost=room.hostId===playerId;selectedGame=room.game;show("lobby");renderGames();renderRoom(room);}
$("copyCode").onclick=async()=>{try{await navigator.clipboard.writeText(room.code);$("copyCode").textContent="Nusxalandi ✓";}catch{$("copyCode").textContent=room.code;}};
$("addQuestion").onclick=()=>{const lines=$("questionData").value.split("\n").map(x=>x.trim()).filter(Boolean);const parsed=[];for(const line of lines){const a=line.split("|").map(x=>x.trim());if(a.length<6||!a[0])continue;parsed.push({question:a[0],answers:a.slice(1,5),correct:Math.max(0,Math.min(3,Number(a[5])-1)),topic:"O‘qituvchi savoli"});}if(!parsed.length){$("questionStatus").textContent="Formatni tekshiring: Savol | A | B | C | D | to‘g‘ri javob (1–4)";return;}questions=parsed;$("questionStatus").textContent=`${parsed.length} ta savol tayyorlandi.`;};
$("startBtn").onclick=()=>{if(!isHost)return alert("O‘yinni faqat xona egasi boshlaydi.");socket.emit("game:start",{game:selectedGame,questions},res=>{if(!res?.ok)alert(res?.error||"Boshlanmadi");});};
$("pauseBtn").onclick=()=>{if(!isHost)return;socket.emit("game:pause",{paused:room?.status==="playing"},()=>{});$("pauseBtn").textContent=room?.status==="playing"?"▶ Davom ettirish":"Ⅱ Pauza";};
$("backLobby").onclick=()=>show("lobby");
$("againBtn").onclick=()=>{show("lobby");};
socket.on("room:update",r=>{if(room&&r.code===room.code){room=r;isHost=r.hostId===playerId;renderRoom(r);}});
function renderRoom(r){$("currentCode").textContent=r.code;$("playerCount").textContent=`${r.players.length} / 40`;$("playerList").innerHTML=r.players.map(p=>`<div class="player-item"><div class="player-avatar">${p.avatar}</div><div class="player-name">${esc(p.name)}</div>${p.id===r.hostId?'<span class="host-tag">HOST</span>':""}</div>`).join("");$("startBtn").disabled=!isHost;$("hostTools").classList.toggle("hidden",!isHost);if(r.status==="playing"&&$("arena").classList.contains("hidden"))show("arena");if(r.status==="finished")show("results");renderLeaderboard(r.players);}
function renderLeaderboard(players){$("leaderboard").innerHTML=[...players].sort((a,b)=>b.score-a.score).map((p,i)=>`<div class="rank-item"><span class="rank-no">${i+1}</span><span>${p.avatar}</span><span class="rank-name">${esc(p.name)}</span><span class="rank-score">${p.score}</span></div>`).join("");}
socket.on("game:question",data=>{currentQuestion=data.question;answered=false;show("arena");$("arenaGame").textContent=games[data.game]?.[1]?.toUpperCase()||"EDUVERSE GAME";$("roundLabel").textContent=`${data.index+1} / ${data.total}`;$("topic").textContent=(currentQuestion.topic||"UMUMIY").toUpperCase();$("questionText").textContent=currentQuestion.question;$("feedback").textContent="";$("progressBar").style.width=`${((data.index+1)/data.total)*100}%`;$("sceneCaption").textContent=gameAura[data.game]?.toUpperCase().replaceAll("-"," ")||"READY PLAYER ONE";$("answerGrid").innerHTML=currentQuestion.answers.map((a,i)=>`<button class="answer-btn" data-answer="${i}"><b>${String.fromCharCode(65+i)}.</b> ${esc(a)}</button>`).join("");document.querySelectorAll("[data-answer]").forEach(b=>b.onclick=()=>submitAnswer(Number(b.dataset.answer)));startTimer(data.deadline);});
function startTimer(deadline){clearInterval(timerHandle);const tick=()=>{secondsLeft=Math.max(0,Math.ceil((deadline-Date.now())/1000));$("timer").textContent=secondsLeft+"s";if(secondsLeft<=0){clearInterval(timerHandle);if(!answered)submitAnswer(-1,true);}};tick();timerHandle=setInterval(tick,250);}
function submitAnswer(index,timeout=false){if(answered)return;answered=true;document.querySelectorAll("[data-answer]").forEach(b=>b.disabled=true);const elapsed=(20-secondsLeft)*1000;socket.emit("answer:submit",{answer:index,elapsed},res=>{if(!res?.ok){$("feedback").textContent=res?.error||"Javob qabul qilinmadi";return;}const btn=document.querySelector(`[data-answer="${res.correctAnswer}"]`);if(btn)btn.classList.add("correct");const chosen=document.querySelector(`[data-answer="${index}"]`);if(chosen&&!res.correct)chosen.classList.add("wrong");$("feedback").textContent=timeout?"⏱ Vaqt tugadi.":res.correct?"✨ To‘g‘ri! Ball qo‘shildi.":"Yana urinib ko‘r! To‘g‘ri javob yashil bilan ko‘rsatilgan.";});}
socket.on("answer:feedback",d=>{if(room)renderLeaderboard(room.players);});
socket.on("game:finished",data=>{clearInterval(timerHandle);show("results");$("finalResults").innerHTML=data.players.map((p,i)=>`<div class="final-row"><strong>${["🥇","🥈","🥉"][i]||`#${i+1}`}</strong><span>${p.avatar||"🎓"} ${esc(p.name)}</span><b>${p.score} ball</b><small>${p.correct||0}/${p.answers||0}</small></div>`).join("");});
socket.on("connect",()=>{});
socket.on("disconnect",()=>{$("notice").textContent="Aloqa uzildi. Internetni tekshirib qayta ulang.";});
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
