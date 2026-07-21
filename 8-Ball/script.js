(function(){
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /*answers*/
  const ANSWERS=[
    "It is certain","It is decidedly so","Without a doubt","Yes — definitely",
    "You may rely on it","As I see it, yes","Most likely","Outlook good",
    "Yes","Signs point to yes","Take it point blank","6 maybe 7?",
    "Reply hazy, try again","Ask again later","Better not tell you now",
    "Maybe in 5?","Concentrate and ask again",
    "Don't count on it","My reply is no","My sources say no",
    "Outlook not so good","Very doubtful","What about no?","I'm telling you no...",
  ];
  let lastAnswer=-1;

  /* elements & state */
  const ball=document.getElementById("ball");
  const sphere=document.getElementById("sphere");
  const die=document.getElementById("die");
  const dieText=document.getElementById("dieText");

  let W=innerWidth, H=innerHeight, R=ball.offsetWidth/2;
  let x=W/2, y=H/2 + H*0.06;          // physics position (ball center)
  let vx=0, vy=0;
  let rot=0;
  let held=false;
  let offX=0, offY=0;
  let downX=0, downY=0, downT=0, moved=0;
  let shake=0;
  let churning=false;
  let bobT=Math.random()*10;
  let wig=0, wigT=0;
  const MARGIN=10;

  function clampPos(){
    x=Math.min(Math.max(x, R+MARGIN), W-R-MARGIN);
    y=Math.min(Math.max(y, R+MARGIN), H-R-MARGIN);
  }

  addEventListener("resize", ()=>{
    W=innerWidth; H=innerHeight; R=ball.offsetWidth/2;
    clampPos();
    if(introOn){ sizeRays(); seedRays(); }
    if(typeof djoActive!=="undefined" && djoActive) layoutDjo();
    if(typeof rylanActive!=="undefined" && rylanActive){ sizeRain(); seedRain(); }
  });

  /* ---------- pointer handling ---------- */
  ball.addEventListener("pointerdown", e=>{
    e.preventDefault();
    ball.setPointerCapture(e.pointerId);
    held=true;
    ball.classList.add("held");
    offX=e.clientX-x; offY=e.clientY-y;
    downX=e.clientX; downY=e.clientY; downT=performance.now(); moved=0;
    vx=0; vy=0;
  });

  ball.addEventListener("pointermove", e=>{
    if(!held) return;
    const nx=e.clientX-offX, ny=e.clientY-offY;
    const nvx=nx-x, nvy=ny-y;
    shake += Math.hypot(nvx-vx, nvy-vy);          // direction changes = shaking
    moved = Math.max(moved, Math.hypot(e.clientX-downX, e.clientY-downY));
    vx=nvx; vy=nvy;
    x=nx; y=ny;
    clampPos();
  });

  function release(e){
    if(!held) return;
    held=false;
    ball.classList.remove("held");
    const dt=performance.now()-downT;
    const speed=Math.hypot(vx,vy);
    if(dt<300 && moved<8){                        // a tap
      if(!reduced){
        sphere.classList.remove("wobble");
        void sphere.offsetWidth;
        sphere.classList.add("wobble");
      }
      churn();
    } else if(speed>26){                          // a proper fling
      churn();
    }
  }
  ball.addEventListener("pointerup", release);
  ball.addEventListener("pointercancel", release);

  ball.addEventListener("keydown", e=>{
    if(e.key==="Enter"||e.key===" "){ e.preventDefault(); churn(); }
  });

  /*the churn: fade in the next answer */
  const question=document.getElementById("question");
  let djoActive=false;
  let homeX=null, homeY=null;      // custom homing target while djo is active

  // Custom answer triggers — first match wins. `effect: "djo"` also plays the halo/hand.
  const TRIGGERS = [
    { pattern:/\bdjo\b/i,     answer:"It's Djo time", effect:"djo" },
    { pattern:/\bdecide\b/i,  answer:"Change",        effect:"djo",   song:"change-audio" },
    { pattern:/\brylan\b/i,   answer:"I love you most baby", effect:"rylan", song:"keepdriving-audio" },
  ];

  /* ---------- audio ---------- */
  const AUDIO = {
    "change-audio": document.getElementById("change-audio"),
    "keepdriving-audio": document.getElementById("keepdriving-audio"),
  };
  function playSong(id){
    // stop anything currently playing, then start the requested track
    stopAllSongs();
    const a = AUDIO[id];
    if(!a) return;
    try{
      a.currentTime = 0;
      const p = a.play();
      if(p && p.catch) p.catch(()=>{});
    }catch(e){}
  }
  function stopAllSongs(){
    for(const id in AUDIO){
      const a = AUDIO[id];
      if(!a) continue;
      try{ a.pause(); a.currentTime = 0; }catch(e){}
    }
  }

  /* ---------- rylan: ASCII ripples ---------- */
  const rainEl=document.getElementById("rain");
  const rctx2=rainEl.getContext("2d");
  const RIPPLE_CHARS=[".","·","'","`",",",":"];
  let ripples=[];
  let rainOn=false;
  let rylanActive=false;
  let rippleTimer=0;

  function sizeRain(){
    const dpr=Math.min(devicePixelRatio||1, 2);
    rainEl.width=W*dpr; rainEl.height=H*dpr;
    rainEl.style.width=W+"px"; rainEl.style.height=H+"px";
    rctx2.setTransform(dpr,0,0,dpr,0,0);
    rctx2.font="14px ui-monospace, Menlo, Consolas, monospace";
    rctx2.textBaseline="middle";
    rctx2.textAlign="center";
  }
  function seedRain(){
    ripples=[];
    // seed a few in-progress ripples so the field looks alive immediately
    for(let i=0;i<3;i++) spawnRipple(Math.random()*40);
  }
  function spawnRipple(startR){
    ripples.push({
      x: 30 + Math.random()*(W-60),
      y: 30 + Math.random()*(H-60),
      r: startR||1,
      maxR: 55 + Math.random()*130,
      speed: 0.35 + Math.random()*0.7,
      ch: RIPPLE_CHARS[Math.floor(Math.random()*RIPPLE_CHARS.length)],
    });
  }
  function drawRain(){
    if(!rainOn) return;
    rctx2.clearRect(0,0,W,H);

    // spawn new ripples over time
    rippleTimer++;
    if(rippleTimer > 14 && ripples.length < 22){
      rippleTimer = 0;
      spawnRipple(1);
      if(Math.random()<0.35) spawnRipple(1);          // occasional second drop
    }

    for(let i=ripples.length-1; i>=0; i--){
      const rp = ripples[i];
      rp.r += rp.speed;
      const life = 1 - (rp.r / rp.maxR);
      if(life <= 0){ ripples.splice(i,1); continue; }

      // ring of characters around the current radius
      const outerAlpha = Math.min(1, life * 1.1);
      const count = Math.max(8, Math.floor(2*Math.PI*rp.r / 11));
      rctx2.fillStyle = "rgba(180,205,255," + (outerAlpha*0.85).toFixed(3) + ")";
      for(let k=0;k<count;k++){
        const a = (k/count)*Math.PI*2;
        const px = rp.x + Math.cos(a)*rp.r;
        const py = rp.y + Math.sin(a)*rp.r;
        rctx2.fillText(rp.ch, px, py);
      }

      // inner echo ring at ~60% radius
      if(rp.r > 16){
        const echoR = rp.r*0.6;
        const echoCount = Math.max(6, Math.floor(2*Math.PI*echoR / 12));
        rctx2.fillStyle = "rgba(160,190,255," + (outerAlpha*0.35).toFixed(3) + ")";
        for(let k=0;k<echoCount;k++){
          const a = (k/echoCount)*Math.PI*2 + 0.15;   // slight offset
          const px = rp.x + Math.cos(a)*echoR;
          const py = rp.y + Math.sin(a)*echoR;
          rctx2.fillText(".", px, py);
        }
      }

      // impact point while the ripple is young
      if(rp.r < 9){
        rctx2.fillStyle = "rgba(220,235,255," + (0.9 - rp.r*0.1).toFixed(3) + ")";
        rctx2.fillText("*", rp.x, rp.y);
      }
    }
    requestAnimationFrame(drawRain);
  }
  function startRain(){
    if(rylanActive) return;
    rylanActive=true;
    document.body.classList.add("rylan-time");
    sizeRain();
    seedRain();
    if(!rainOn){ rainOn=true; requestAnimationFrame(drawRain); }
  }
  function stopRain(){
    if(!rylanActive) return;
    rylanActive=false;
    document.body.classList.remove("rylan-time");
    setTimeout(()=>{ if(!rylanActive){ rainOn=false; rctx2.clearRect(0,0,W,H); ripples=[]; } }, 1300);
  }

  function layoutDjo(){
    const hand=document.getElementById("djo-hand");
    if(!hand) return;
    const artW=hand.offsetWidth, artH=hand.offsetHeight;
    // grip circle in the artwork: centre (59.5%, 49%), diameter ≈ 32.5 rows
    homeX = W/2 + (0.595-0.5)*artW;
    homeY = H/2 + (0.49-0.5)*artH;
    const rowPx = artH/49;                    // line-height:1 → row height = font-size
    const gripD = rowPx*32.5;
    const s = Math.max(0.3, gripD / ball.offsetWidth);
    sphere.style.transform = "scale("+s.toFixed(3)+")";
  }

  function triggerDjo(){
    if(djoActive) return;
    djoActive=true;
    document.body.classList.add("djo-time");
    layoutDjo();
  }
  function clearDjo(){
    if(!djoActive) return;
    djoActive=false;
    document.body.classList.remove("djo-time");
    homeX=null; homeY=null;
    sphere.style.transform="";
  }

  function churn(){
    if(churning) return;
    churning=true;
    shake=0;
    die.classList.remove("show");
    const q = question && question.value || "";
    const trigger = TRIGGERS.find(t => t.pattern.test(q));
    setTimeout(()=>{
      let a;
      if(trigger){
        a = trigger.answer;
        // apply the trigger's effect(s)
        if(trigger.effect === "djo") triggerDjo(); else if(djoActive) clearDjo();
        if(trigger.effect === "rylan") startRain(); else if(rylanActive) stopRain();
        if(trigger.song) playSong(trigger.song); else stopAllSongs();
      } else {
        if(djoActive) clearDjo();
        if(rylanActive) stopRain();
        stopAllSongs();
        let i;
        do{ i=Math.floor(Math.random()*ANSWERS.length); }while(i===lastAnswer);
        lastAnswer=i;
        a=ANSWERS[i];
      }
      dieText.textContent=a;
      die.style.setProperty("--fit",
        a.length<=8 ? 1 : a.length<=14 ? 0.94 : a.length<=20 ? 0.85 : 0.76);
      die.classList.add("show");
      churning=false;
    }, reduced?250:600);
  }

  /* ---------- intro sequence ---------- */
  const intro=document.getElementById("intro");
  const introCard=document.getElementById("introCard");
  const raysEl=document.getElementById("rays");
  const rctx=raysEl.getContext("2d");
  let introStep=0, introOn=true, collapsing=false;
  let particles=[];

  function sizeRays(){
    const dpr=Math.min(devicePixelRatio||1, 2);
    raysEl.width=W*dpr; raysEl.height=H*dpr;
    raysEl.style.width=W+"px"; raysEl.style.height=H+"px";
    rctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function seedRays(){
    particles=[];
    const base=Math.min(W,H);
    const rMax=Math.hypot(W,H)/2 * 1.05;
    const rMin=base*0.08;                 // inner sink zone at the card
    const N=320;
    for(let i=0;i<N;i++){
      const r = rMin + Math.pow(Math.random(), 0.55) * (rMax-rMin);
      const a = Math.random()*Math.PI*2;
      const dir = Math.random()<0.5 ? 1 : -1;   // half swirl each way
      particles.push({
        a, r, dir, rMin, rMax,
        sz: Math.random()<0.82 ? 1.1 : 2.0,
        o:  0.18 + Math.random()*0.55,
        inSp: 0.175 + Math.random()*0.275,      // inward drift
        angSp: 0.00125 + Math.random()*0.003,    // orbital speed
        jp: Math.random()*Math.PI*2,
      });
    }
  }

  function drawRays(t){
    rctx.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2;
    const base=Math.min(W,H);
    for(const p of particles){
      // acceleration as it approaches the center — feels like a drain
      const closeness = 1 - Math.min(1, (p.r-p.rMin)/(p.rMax-p.rMin));
      const boost = 1 + closeness*4;
      if(collapsing){
        p.r -= p.r*0.16 + 3;
        p.a += p.dir * p.angSp * 8;
        if(p.r < 2) p.r = 2;
      } else if(!reduced){
        p.r -= p.inSp * boost;
        p.a += p.dir * p.angSp * boost;
        if(p.r < p.rMin){                        // respawn at the outer edge
          p.r = p.rMax;
          p.a = Math.random()*Math.PI*2;
        }
      }
      const px = cx + Math.cos(p.a)*p.r;
      const py = cy + Math.sin(p.a)*p.r;
      const flick = reduced ? 1 : 0.75 + 0.25*Math.sin(t*0.003 + p.jp);
      const centerFade = Math.min(1, (p.r-p.rMin)/(base*0.06));
      const alpha = collapsing ? 0.9 : p.o * flick * centerFade;
      rctx.globalAlpha = Math.max(0, alpha);
      rctx.fillStyle = "#e8ecff";
      rctx.beginPath();
      rctx.arc(px,py,p.sz,0,Math.PI*2);
      rctx.fill();
    }
    rctx.globalAlpha=1;
    if(introOn) requestAnimationFrame(drawRays);
  }

  sizeRays();
  seedRays();
  requestAnimationFrame(drawRays);

  function askTheQuestion(){
    if(introStep!==0) return;
    introStep=1;
    introCard.innerHTML=
      '<div class="sq">♾</div>'+
      '<p>Want to know<br>the answer?</p>'+
      '<div class="intro-btns">'+
        '<button type="button" id="btnYes">Yes</button>'+
        '<button type="button" id="btnObv">Obviously</button>'+
      '</div>';
    introCard.classList.add("step-2");
    document.getElementById("btnYes").addEventListener("click", enterSite);
    document.getElementById("btnObv").addEventListener("click", enterSite);
    document.getElementById("btnYes").focus();
  }

  function enterSite(e){
    if(introStep!==1) return;
    introStep=2;
    if(e) e.stopPropagation();
    collapsing=true;
    intro.classList.add("leave");
    setTimeout(()=>{
      introOn=false;
      intro.remove();
      document.body.classList.remove("intro-active");
      if(!reduced){
        sphere.classList.add("pop");
        sphere.addEventListener("animationend",
          ()=>sphere.classList.remove("pop"), {once:true});
      }
      setTimeout(churn, reduced?150:550);
    }, reduced?150:650);
  }

  introCard.addEventListener("click", askTheQuestion);
  introCard.addEventListener("keydown", e=>{
    if(e.key==="Enter"||e.key===" "){ e.preventDefault(); askTheQuestion(); }
  });

  /* ---------- question input ---------- */
  question.addEventListener("keydown", e=>{
    if(e.key==="Enter"){
      e.preventDefault();
      question.blur();
      churn();
    }
  });

  /* ---------- physics loop ---------- */
  function frame(){
    if(!held){
      // gentle homing spring — toward the grip during djo, else screen centre
      const cx = homeX!==null ? homeX : W/2;
      const cy = homeY!==null ? homeY : H/2;
      vx += (cx - x) * 0.0018;
      vy += (cy - y) * 0.0018;
      x+=vx; y+=vy;
      vx*=0.965; vy*=0.965;                    // a touch more damping to settle cleanly
      if(Math.abs(x-cx)<0.4 && Math.abs(y-cy)<0.4 &&
         Math.hypot(vx,vy)<0.05){
        x=cx; y=cy; vx=0; vy=0;                // snap to center once it's basically there
      }
      // bounce
      if(x<R+MARGIN){ x=R+MARGIN; vx=-vx*0.72; }
      if(x>W-R-MARGIN){ x=W-R-MARGIN; vx=-vx*0.72; }
      if(y<R+MARGIN){ y=R+MARGIN; vy=-vy*0.72; }
      if(y>H-R-MARGIN){ y=H-R-MARGIN; vy=-vy*0.72; }
    } else {
      // let held velocity settle so a paused hand doesn't fling on release
      vx*=0.8; vy*=0.8;
    }

    // shake energy decays; big sustained shaking triggers the churn
    shake*=0.94;
    if(held && shake>260) churn();

    // wiggle while dragging: amplitude follows drag speed, fades after release
    let wiggle=0;
    if(!reduced){
      const sp=Math.hypot(vx,vy);
      const target=held ? Math.min(sp,42)/42 : 0;
      wig += (target-wig)*0.14;
      if(!held) wig*=0.92;
      wigT += 0.5 + wig*0.3;
      wiggle = Math.sin(wigT)*wig*8;
    }

    // gentle idle bob
    let bob=0;
    if(!held && !reduced && Math.hypot(vx,vy)<0.3){
      bobT+=0.018;
      bob=Math.sin(bobT)*6;
    }

    // tilt with horizontal motion
    const targetRot=Math.max(-13, Math.min(13, vx*1.1));
    rot += (targetRot-rot)*0.12;

    ball.style.transform=
      "translate("+(x-R)+"px,"+(y-R+bob)+"px) rotate("+(rot+wiggle).toFixed(2)+"deg)";
    requestAnimationFrame(frame);
  }

  clampPos();
  requestAnimationFrame(frame);
})();
