const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const PORT = process.env.PORT || 3000;
app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, service: "EDUVERSE 3D" }));

const rooms = new Map();
const MAX_PLAYERS = 40;
const defaultQuestions = [
  { question: "O‘zbekiston poytaxti qaysi shahar?", answers: ["Samarqand", "Toshkent", "Buxoro", "Xiva"], correct: 1, topic: "Geografiya" },
  { question: "HTML nimani belgilaydi?", answers: ["Veb sahifa tuzilishini", "Faqat ma’lumotlar bazasini", "Operatsion tizimni", "Internet tezligini"], correct: 0, topic: "IT" },
  { question: "Suvning kimyoviy formulasi qaysi?", answers: ["CO2", "O2", "H2O", "NaCl"], correct: 2, topic: "Kimyo" }
];
const gameNames = [
"Knowledge Race","Sky Islands","Knowledge Royale","Treasure Hunt","Boss Battle","Laser Quiz","Memory Matrix","Puzzle Factory","Duel Arena","Team Clash",
"Escape Room","Rapid Fire","Sorting Challenge","Connect the Dots","Mystery Box","Auction of Knowledge","Debate Arena","Detective Academy","Survival Tower","Grand Championship"
];
function code() { return crypto.randomBytes(3).toString("hex").toUpperCase(); }
function publicRoom(r) {
  return { code:r.code, hostId:r.hostId, game:r.game, status:r.status, players:[...r.players.values()].map(p=>({id:p.id,name:p.name,avatar:p.avatar,score:p.score,team:p.team,ready:p.ready})), questions:r.questions, questionIndex:r.questionIndex, deadline:r.deadline, round:r.round };
}
function broadcast(r) { io.to(r.code).emit("room:update", publicRoom(r)); }
function makeRoom(host, data) {
  let c=code(); while(rooms.has(c)) c=code();
  const r={code:c,hostId:host.id,game:Math.max(0,Math.min(19,Number(data.game)||0)),status:"lobby",players:new Map(),questions:Array.isArray(data.questions)&&data.questions.length?data.questions.slice(0,100):defaultQuestions,questionIndex:0,deadline:null,round:1,createdAt:Date.now()};
  rooms.set(c,r); return r;
}
function cleanQuestion(q) {
  if(!q || typeof q.question!=="string" || !Array.isArray(q.answers)) return null;
  return {question:q.question.slice(0,500),answers:q.answers.slice(0,6).map(a=>String(a).slice(0,200)),correct:Math.max(0,Math.min(q.answers.length-1,Number(q.correct)||0)),topic:String(q.topic||"Umumiy").slice(0,80)};
}
io.on("connection", socket => {
  socket.on("room:create", (data={}, cb=()=>{}) => {
    const name=String(data.name||"Mehmon").trim().slice(0,24)||"Mehmon";
    const r=makeRoom(socket,{...data,game:data.game});
    const player={id:socket.id,name,avatar:String(data.avatar||"🧑‍🚀").slice(0,8),score:0,team:0,ready:true,answers:0,correct:0};
    r.players.set(socket.id,player); socket.join(r.code); socket.data.room=r.code;
    cb({ok:true,room:publicRoom(r),playerId:socket.id}); broadcast(r);
  });
  socket.on("room:join", (data={}, cb=()=>{}) => {
    const c=String(data.code||"").toUpperCase().trim(), r=rooms.get(c);
    if(!r) return cb({ok:false,error:"Bunday xona topilmadi."});
    if(r.status!=="lobby") return cb({ok:false,error:"O‘yin allaqachon boshlangan."});
    if(r.players.size>=MAX_PLAYERS) return cb({ok:false,error:"Xona 40 ishtirokchi bilan to‘lgan."});
    const name=String(data.name||"Mehmon").trim().slice(0,24)||"Mehmon";
    const p={id:socket.id,name,avatar:String(data.avatar||"🧑‍🚀").slice(0,8),score:0,team:r.players.size%2,ready:true,answers:0,correct:0};
    r.players.set(socket.id,p); socket.join(r.code); socket.data.room=r.code;
    cb({ok:true,room:publicRoom(r),playerId:socket.id}); broadcast(r);
  });
  socket.on("game:start", (data={}, cb=()=>{}) => {
    const r=rooms.get(socket.data.room); if(!r) return cb?.({ok:false,error:"Xona topilmadi."});
    if(socket.id!==r.hostId) return cb?.({ok:false,error:"Faqat xona egasi boshlashi mumkin."});
    if(r.players.size<1) return cb?.({ok:false,error:"O‘yinchi yo‘q."});
    if(Array.isArray(data.questions)&&data.questions.length) r.questions=data.questions.map(cleanQuestion).filter(Boolean).slice(0,100);
    if(!r.questions.length) r.questions=defaultQuestions;
    r.game=Math.max(0,Math.min(19,Number(data.game)||r.game));
    r.status="playing"; r.questionIndex=0; r.round=1;
    for(const p of r.players.values()){p.score=0;p.answers=0;p.correct=0;}
    r.deadline=Date.now()+20000; io.to(r.code).emit("game:question", {question:r.questions[0],index:0,total:r.questions.length,deadline:r.deadline,game:r.game});
    broadcast(r); cb?.({ok:true});
  });
  socket.on("answer:submit", (data={}, cb=()=>{}) => {
    const r=rooms.get(socket.data.room), p=r?.players.get(socket.id);
    if(!r||!p||r.status!=="playing") return cb?.({ok:false,error:"O‘yin faol emas."});
    const q=r.questions[r.questionIndex]; if(!q) return cb?.({ok:false,error:"Savol topilmadi."});
    if(p.lastQuestion===r.questionIndex) return cb?.({ok:false,error:"Bu savolga javob berdingiz."});
    p.lastQuestion=r.questionIndex; p.answers++;
    const correct=Number(data.answer)===q.correct;
    if(correct){p.correct++;p.score+=100;}
    const elapsed=Math.max(0,20000-(Number(data.elapsed)||0));
    if(correct) p.score+=Math.round(Math.min(30,elapsed/20000*30));
    cb?.({ok:true,correct,correctAnswer:q.correct,score:p.score});
    io.to(r.code).emit("answer:feedback",{playerId:p.id,name:p.name,correct,score:p.score});
    broadcast(r);
    const answered=[...r.players.values()].filter(x=>x.lastQuestion===r.questionIndex).length;
    if(answered>=r.players.size) advance(r);
  });
  socket.on("game:next", (_data={}, cb=()=>{}) => {
    const r=rooms.get(socket.data.room); if(!r) return cb?.({ok:false});
    if(socket.id!==r.hostId) return cb?.({ok:false,error:"Faqat xona egasi keyingi savolga o‘ta oladi."});
    advance(r); cb?.({ok:true});
  });
  socket.on("game:pause", (data={}, cb=()=>{}) => {
    const r=rooms.get(socket.data.room); if(!r||socket.id!==r.hostId) return cb?.({ok:false});
    r.status=data.paused?"paused":"playing"; broadcast(r); cb?.({ok:true});
  });
  socket.on("room:leave", () => leave(socket));
  socket.on("disconnect", () => leave(socket));
});
function advance(r) {
  if(r.status!=="playing") return;
  r.questionIndex++;
  if(r.questionIndex>=r.questions.length) {
    r.status="finished"; r.deadline=null;
    io.to(r.code).emit("game:finished",{players:[...r.players.values()].map(p=>({name:p.name,avatar:p.avatar,score:p.score,correct:p.correct,answers:p.answers})).sort((a,b)=>b.score-a.score)});
    broadcast(r); return;
  }
  r.round++; r.deadline=Date.now()+20000;
  io.to(r.code).emit("game:question",{question:r.questions[r.questionIndex],index:r.questionIndex,total:r.questions.length,deadline:r.deadline,game:r.game});
  broadcast(r);
}
function leave(socket) {
  const c=socket.data.room, r=rooms.get(c); if(!r) return;
  r.players.delete(socket.id); socket.leave(c);
  if(!r.players.size) rooms.delete(c);
  else { if(r.hostId===socket.id) r.hostId=r.players.keys().next().value; broadcast(r); }
  delete socket.data.room;
}
server.listen(PORT,()=>console.log(`EDUVERSE 3D running on port ${PORT}`));
