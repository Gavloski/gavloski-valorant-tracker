const HOME_PLAYER={name:"GAVLOSKI",tag:"片想い",region:"br"};
let PLAYER={...HOME_PLAYER};
const API="https://api.henrikdev.xyz/valorant";
const $=id=>document.getElementById(id);
const safe=n=>Number.isFinite(n)?n:0;
let CURRENT_MATCHES=[];

function getApiKey(){return localStorage.getItem("henrik_api_key")?.trim()||""}
function openApiModal(){
  $("apiKeyInput").value=getApiKey();
  $("keyError").classList.add("hidden");
  $("apiModal").classList.remove("hidden");
  setTimeout(()=>$("apiKeyInput").focus(),50);
}
function closeApiModal(){if(getApiKey()) $("apiModal").classList.add("hidden")}
function saveApiKey(){
  const key=$("apiKeyInput").value.trim();
  if(!key.startsWith("HDEV-")){
    $("keyError").classList.remove("hidden");
    return;
  }
  localStorage.setItem("henrik_api_key",key);
  $("apiModal").classList.add("hidden");
  load();
}
async function getJSON(path,key){
  const res=await fetch(API+path,{headers:{Accept:"application/json",Authorization:key}});
  if(res.status===401||res.status===403){
    localStorage.removeItem("henrik_api_key");
    throw new Error("API_KEY_INVALIDA");
  }
  if(!res.ok) throw new Error(res.status===429?"Limite temporário da API atingido. Aguarde alguns minutos.":"A API respondeu com erro "+res.status+".");
  const json=await res.json();
  if(json.status && json.status!==200) throw new Error(json.errors?.[0]?.message||"Não foi possível obter os dados.");
  return json.data;
}
function findMe(match){
  return match.players?.all_players?.find(p=>p.name?.toLowerCase()===PLAYER.name.toLowerCase()&&p.tag===PLAYER.tag);
}
function renderRank(mmr){
  const current=mmr?.current||mmr?.current_data||mmr;
  const tier=current?.tier?.name||current?.currenttierpatched||current?.current_tier?.patched||"Não classificado";
  const rr=safe(current?.rr??current?.ranking_in_tier);
  $("rankName").textContent=tier;
  $("rankInitial").textContent=tier==="Não classificado"?"—":tier.split(" ").map(x=>x[0]).join("");
  $("rrValue").textContent=rr+" RR";
  $("rrBar").style.width=Math.max(0,Math.min(100,rr))+"%";
}
function renderMatches(matches){
  const rows=matches.slice(0,10).map(m=>({match:m,me:findMe(m)})).filter(x=>x.me);
  CURRENT_MATCHES=rows;
  let kills=0,deaths=0,shots=0,heads=0,score=0,wins=0,rounds=0;
  rows.forEach(({match:m,me:p})=>{
    kills+=safe(p.stats?.kills); deaths+=safe(p.stats?.deaths); score+=safe(p.stats?.score);
    heads+=safe(p.stats?.headshots); shots+=safe(p.stats?.headshots)+safe(p.stats?.bodyshots)+safe(p.stats?.legshots);
    const red=p.team?.toLowerCase()==="red", won=red?safe(m.teams?.red?.rounds_won)>safe(m.teams?.blue?.rounds_won):safe(m.teams?.blue?.rounds_won)>safe(m.teams?.red?.rounds_won);
    wins+=won?1:0; rounds+=safe(m.teams?.red?.rounds_won)+safe(m.teams?.blue?.rounds_won);
  });
  $("kd").textContent=deaths?(kills/deaths).toFixed(2):kills.toFixed(2);
  $("kills").textContent=kills+" eliminações";
  $("acs").textContent=rounds?Math.round(score/rounds):"—";
  $("hs").textContent=shots?Math.round(heads/shots*100)+"%":"—";
  $("headshots").textContent=heads+" headshots";
  $("winRate").textContent=rows.length?Math.round(wins/rows.length*100)+"%":"—";
  $("record").textContent=wins+"V • "+(rows.length-wins)+"D";
  $("matchCount").textContent=rows.length+" jogos";
  $("matches").innerHTML=rows.slice(0,10).map(({match:m,me:p},index)=>{
    const red=p.team?.toLowerCase()==="red",a=red?m.teams.red:m.teams.blue,b=red?m.teams.blue:m.teams.red,won=safe(a?.rounds_won)>safe(b?.rounds_won);
    const kd=safe(p.stats?.deaths)?(safe(p.stats.kills)/safe(p.stats.deaths)).toFixed(2):safe(p.stats?.kills).toFixed(2);
    const date=m.metadata?.game_start_patched||m.metadata?.game_start||"Partida recente";
    return `<div class="match" data-match-index="${index}" tabindex="0" role="button" aria-label="Ver detalhes da partida em ${m.metadata?.map||"mapa"}"><div class="agent">${(p.character||"?").slice(0,2).toUpperCase()}</div><div class="match-main"><strong>${p.character||"Agente"} • ${safe(p.stats?.kills)}/${safe(p.stats?.deaths)}/${safe(p.stats?.assists)}</strong><small>${m.metadata?.map||"Mapa"} • K/D ${kd} • ${date}</small></div><div class="score">${safe(a?.rounds_won)} : ${safe(b?.rounds_won)}</div><div class="result ${won?"win":"loss"}">${won?"VITÓRIA":"DERROTA"}</div></div>`;
  }).join("")||'<p class="subtitle">Nenhuma partida competitiva recente encontrada.</p>';
  document.querySelectorAll("[data-match-index]").forEach(row=>{
    row.addEventListener("click",()=>openMatchDetail(Number(row.dataset.matchIndex)));
    row.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();openMatchDetail(Number(row.dataset.matchIndex))}});
  });
  const kd=deaths?kills/deaths:kills,wr=rows.length?wins/rows.length:0,hs=shots?heads/shots:0;
  if(kd<1){$("focusTitle").textContent="Preserve mais suas vidas";$("focusText").textContent="Seu K/D recente indica que sobreviver e buscar trocas favoráveis deve ser a prioridade. Evite reabrir ângulos sem utilidade ou apoio."}
  else if(hs<.2){$("focusTitle").textContent="Altura de mira e primeiro tiro";$("focusText").textContent="Seu impacto está bom, mas há espaço para converter mais duelos com crosshair placement e pequenas pausas antes do disparo."}
  else if(wr<.5){$("focusTitle").textContent="Converta vantagem em rounds";$("focusText").textContent="Os números individuais não parecem ser o maior limite. Foque comunicação curta, disciplina no pós-plant e decisões com vantagem numérica."}
  else{$("focusTitle").textContent="Mantenha a consistência";$("focusText").textContent="A sequência recente está positiva. Preserve a rotina, limite sessões após duas derrotas seguidas e repita as decisões que geram vantagem."}
}

function fmtDuration(value){
  const seconds=value>100000?Math.round(value/1000):Math.round(value||0);
  return Math.floor(seconds/60)+"m "+String(seconds%60).padStart(2,"0")+"s";
}
function playerMetrics(player,totalRounds){
  const stats=player.stats||{},shots=safe(stats.headshots)+safe(stats.bodyshots)+safe(stats.legshots);
  return {
    kills:safe(stats.kills),deaths:safe(stats.deaths),assists:safe(stats.assists),
    acs:totalRounds?Math.round(safe(stats.score)/totalRounds):0,
    adr:totalRounds?Math.round(safe(player.damage_made)/totalRounds):0,
    hs:shots?Math.round(safe(stats.headshots)/shots*100):0
  };
}
function openMatchDetail(index){
  const item=CURRENT_MATCHES[index];if(!item)return;
  const m=item.match,p=item.me,red=p.team?.toLowerCase()==="red";
  const own=red?m.teams?.red:m.teams?.blue,enemy=red?m.teams?.blue:m.teams?.red;
  const won=safe(own?.rounds_won)>safe(enemy?.rounds_won);
  const totalRounds=safe(m.teams?.red?.rounds_won)+safe(m.teams?.blue?.rounds_won);
  const pm=playerMetrics(p,totalRounds);
  const all=[...(m.players?.all_players||[])].sort((a,b)=>safe(b.stats?.score)-safe(a.stats?.score));
  const teams=["Red","Blue"];
  const scoreboard=teams.map(team=>{
    const players=all.filter(x=>x.team?.toLowerCase()===team.toLowerCase());
    if(!players.length)return "";
    return `<tr class="team-divider"><td colspan="7">TIME ${team==="Red"?"VERMELHO":"AZUL"}</td></tr>`+players.map(x=>{
      const v=playerMetrics(x,totalRounds),isMe=x.name?.toLowerCase()===PLAYER.name.toLowerCase()&&x.tag===PLAYER.tag;
      return `<tr class="${isMe?"me-row":""}"><td class="player-cell"><strong>${x.name||"Jogador"}#${x.tag||""}</strong><small>${x.character||"Agente"}</small></td><td>${v.kills}</td><td>${v.deaths}</td><td>${v.assists}</td><td>${v.acs}</td><td>${v.adr}</td><td>${v.hs}%</td></tr>`;
    }).join("");
  }).join("");
  const date=m.metadata?.game_start_patched||m.metadata?.game_start||"Data indisponível";
  $("matchDetailContent").innerHTML=`
    <span class="detail-kicker">DETALHES DA PARTIDA</span>
    <div class="detail-header"><div><h2 id="matchDetailTitle">${m.metadata?.map||"Mapa"} · ${p.character||"Agente"}</h2><p>${date} · ${m.metadata?.mode||"Competitivo"} · ${fmtDuration(m.metadata?.game_length)}</p></div>
    <div class="detail-result"><strong>${safe(own?.rounds_won)} : ${safe(enemy?.rounds_won)}</strong><span class="${won?"win-text":"loss-text"}">${won?"VITÓRIA":"DERROTA"}</span></div></div>
    <div class="detail-stats">
      <div class="detail-stat"><span>ABATES</span><strong>${pm.kills}</strong></div>
      <div class="detail-stat"><span>MORTES</span><strong>${pm.deaths}</strong></div>
      <div class="detail-stat"><span>ASSIST.</span><strong>${pm.assists}</strong></div>
      <div class="detail-stat"><span>ACS</span><strong>${pm.acs}</strong></div>
      <div class="detail-stat"><span>ADR</span><strong>${pm.adr}</strong></div>
      <div class="detail-stat"><span>HEADSHOT</span><strong>${pm.hs}%</strong></div>
    </div>
    <h3 class="scoreboard-title">Placar de jogadores</h3>
    <div style="overflow-x:auto"><table class="scoreboard"><thead><tr><th>JOGADOR</th><th>K</th><th>D</th><th>A</th><th>ACS</th><th>ADR</th><th>HS%</th></tr></thead><tbody>${scoreboard}</tbody></table></div>
    <p class="detail-hint">Os cálculos consideram os rounds disputados nesta partida.</p>`;
  $("matchModal").classList.remove("hidden");
}
function closeMatchDetail(){$("matchModal").classList.add("hidden")}

function updatePlayerHeader(){
  $("playerName").textContent=PLAYER.name;
  $("playerTag").textContent="#"+PLAYER.tag;
  const regions={br:"Brasil",na:"América do Norte",latam:"América Latina",eu:"Europa",ap:"Ásia-Pacífico",kr:"Coreia"};
  $("playerRegion").textContent=regions[PLAYER.region]||PLAYER.region.toUpperCase();
  $("riotIdInput").value=PLAYER.name+"#"+PLAYER.tag;
}
function resetDashboard(){
  ["kd","acs","hs","winRate"].forEach(id=>$(id).textContent="—");
  $("rankName").textContent="Consultando...";
  $("rankInitial").textContent="—";$("rrValue").textContent="— RR";$("rrBar").style.width="0";
  $("matches").innerHTML='<div class="loading-row"></div><div class="loading-row"></div><div class="loading-row"></div>';
}
async function searchPlayer(event){
  event?.preventDefault();
  const value=$("riotIdInput").value.trim();
  const split=value.lastIndexOf("#");
  if(split<1||split===value.length-1){
    $("notice").textContent="Digite a Riot ID completa no formato Nome#TAG.";
    $("notice").classList.remove("hidden");return;
  }
  const key=getApiKey();if(!key){openApiModal();return}
  const button=$("playerSearchForm").querySelector("button");
  button.disabled=true;button.textContent="Buscando...";
  try{
    const name=value.slice(0,split).trim(),tag=value.slice(split+1).trim();
    const account=await getJSON(`/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,key);
    PLAYER={name:account.name||name,tag:account.tag||tag,region:account.region||"br"};
    updatePlayerHeader();resetDashboard();await load();
  }catch(err){
    $("notice").textContent=err.message==="API_KEY_INVALIDA"?"A chave da API é inválida ou expirou.":"Jogador não encontrado. Confira exatamente o Nome#TAG.";
    $("notice").classList.remove("hidden");
    if(err.message==="API_KEY_INVALIDA")openApiModal();
  }finally{button.disabled=false;button.textContent="Consultar"}
}
async function load(){
  $("refreshButton").disabled=true;$("notice").classList.add("hidden");$("syncLabel").textContent="ATUALIZANDO";
  try{
    const key=getApiKey();
    if(!key){openApiModal();throw new Error("CHAVE_NAO_INFORMADA")}
    const [mmr,matches]=await Promise.all([
      getJSON(`/v3/mmr/${PLAYER.region}/pc/${encodeURIComponent(PLAYER.name)}/${encodeURIComponent(PLAYER.tag)}`,key),
      getJSON(`/v3/matches/${PLAYER.region}/${encodeURIComponent(PLAYER.name)}/${encodeURIComponent(PLAYER.tag)}?mode=competitive&size=10`,key)
    ]);
    renderRank(mmr);renderMatches(Array.isArray(matches)?matches:[]);
    $("syncLabel").textContent="DADOS ATUALIZADOS";$("rankChange").textContent=new Date().toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
  }catch(err){
    if(err.message==="API_KEY_INVALIDA"){
      $("notice").textContent="A chave da API é inválida ou expirou. Abra “Chave da API” e informe uma nova.";
      openApiModal();
    }else if(err.message==="CHAVE_NAO_INFORMADA"){
      $("notice").textContent="É necessário informar uma chave gratuita da HenrikDev. Clique em “Atualizar dados” para inserir.";
    }else{
      $("notice").textContent=err.message+" Confirme também que a Riot ID é GAVLOSKI#片想い.";
    }
    $("notice").classList.remove("hidden");$("syncLabel").textContent="CONFIGURAÇÃO NECESSÁRIA";
    $("matches").innerHTML='<p class="subtitle">Clique em “Atualizar dados” para tentar novamente.</p>';
  }finally{$("refreshButton").disabled=false}
}
$("refreshButton").addEventListener("click",load);
$("closeMatchModal").addEventListener("click",closeMatchDetail);
$("matchModal").addEventListener("click",event=>{if(event.target===$("matchModal"))closeMatchDetail()});
document.addEventListener("keydown",event=>{if(event.key==="Escape")closeMatchDetail()});
$("playerSearchForm").addEventListener("submit",searchPlayer);
$("myProfileButton").addEventListener("click",()=>{PLAYER={...HOME_PLAYER};updatePlayerHeader();resetDashboard();load()});
updatePlayerHeader();
$("apiSettingsButton").addEventListener("click",openApiModal);
$("closeApiModal").addEventListener("click",closeApiModal);
$("saveApiKey").addEventListener("click",saveApiKey);
$("apiKeyInput").addEventListener("keydown",e=>{if(e.key==="Enter")saveApiKey()});
$("toggleApiKey").addEventListener("click",()=>{
  const input=$("apiKeyInput"),show=input.type==="password";
  input.type=show?"text":"password";
  $("toggleApiKey").textContent=show?"Ocultar":"Mostrar";
});
load();
const PHOTO_KEY="gavloski_profile_photo";
function applyProfilePhoto(){
  const photo=localStorage.getItem(PHOTO_KEY);
  if(photo){
    $("profileImage").src=photo;
    $("profileImage").classList.remove("hidden");
    $("avatarFallback").classList.add("hidden");
    $("removePhotoButton").classList.remove("hidden");
  }else{
    $("profileImage").removeAttribute("src");
    $("profileImage").classList.add("hidden");
    $("avatarFallback").classList.remove("hidden");
    $("removePhotoButton").classList.add("hidden");
  }
}
function chooseProfilePhoto(){$("profilePhotoInput").click()}
$("avatarButton").addEventListener("click",chooseProfilePhoto);
$("changePhotoButton").addEventListener("click",chooseProfilePhoto);
$("removePhotoButton").addEventListener("click",()=>{localStorage.removeItem(PHOTO_KEY);applyProfilePhoto()});
$("profilePhotoInput").addEventListener("change",event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  if(file.size>3*1024*1024){alert("Escolha uma imagem com até 3 MB.");event.target.value="";return}
  const reader=new FileReader();
  reader.onload=()=>{localStorage.setItem(PHOTO_KEY,reader.result);applyProfilePhoto()};
  reader.readAsDataURL(file);
  event.target.value="";
});
applyProfilePhoto();