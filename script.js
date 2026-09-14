const PLAYER={name:"Gavloski",tag:"Белла",region:"br"};
const API="https://api.henrikdev.xyz/valorant";
const $=id=>document.getElementById(id);
const safe=n=>Number.isFinite(n)?n:0;

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
  const current=mmr?.current_data||mmr;
  const tier=current?.currenttierpatched||current?.current_tier?.patched||"Não classificado";
  const rr=safe(current?.ranking_in_tier??current?.rr);
  $("rankName").textContent=tier;
  $("rankInitial").textContent=tier==="Não classificado"?"—":tier.split(" ").map(x=>x[0]).join("");
  $("rrValue").textContent=rr+" RR";
  $("rrBar").style.width=Math.max(0,Math.min(100,rr))+"%";
}
function renderMatches(matches){
  const rows=matches.map(m=>({match:m,me:findMe(m)})).filter(x=>x.me);
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
  $("matches").innerHTML=rows.slice(0,6).map(({match:m,me:p})=>{
    const red=p.team?.toLowerCase()==="red",a=red?m.teams.red:m.teams.blue,b=red?m.teams.blue:m.teams.red,won=safe(a?.rounds_won)>safe(b?.rounds_won);
    const kd=safe(p.stats?.deaths)?(safe(p.stats.kills)/safe(p.stats.deaths)).toFixed(2):safe(p.stats?.kills).toFixed(2);
    const date=m.metadata?.game_start_patched||m.metadata?.game_start||"Partida recente";
    return `<div class="match"><div class="agent">${(p.character||"?").slice(0,2).toUpperCase()}</div><div class="match-main"><strong>${p.character||"Agente"} • ${safe(p.stats?.kills)}/${safe(p.stats?.deaths)}/${safe(p.stats?.assists)}</strong><small>${m.metadata?.map||"Mapa"} • K/D ${kd} • ${date}</small></div><div class="score">${safe(a?.rounds_won)} : ${safe(b?.rounds_won)}</div><div class="result ${won?"win":"loss"}">${won?"VITÓRIA":"DERROTA"}</div></div>`;
  }).join("")||'<p class="subtitle">Nenhuma partida competitiva recente encontrada.</p>';
  const kd=deaths?kills/deaths:kills,wr=rows.length?wins/rows.length:0,hs=shots?heads/shots:0;
  if(kd<1){$("focusTitle").textContent="Preserve mais suas vidas";$("focusText").textContent="Seu K/D recente indica que sobreviver e buscar trocas favoráveis deve ser a prioridade. Evite reabrir ângulos sem utilidade ou apoio."}
  else if(hs<.2){$("focusTitle").textContent="Altura de mira e primeiro tiro";$("focusText").textContent="Seu impacto está bom, mas há espaço para converter mais duelos com crosshair placement e pequenas pausas antes do disparo."}
  else if(wr<.5){$("focusTitle").textContent="Converta vantagem em rounds";$("focusText").textContent="Os números individuais não parecem ser o maior limite. Foque comunicação curta, disciplina no pós-plant e decisões com vantagem numérica."}
  else{$("focusTitle").textContent="Mantenha a consistência";$("focusText").textContent="A sequência recente está positiva. Preserve a rotina, limite sessões após duas derrotas seguidas e repita as decisões que geram vantagem."}
}
async function load(){
  $("refreshButton").disabled=true;$("notice").classList.add("hidden");$("syncLabel").textContent="ATUALIZANDO";
  try{
    const key=getApiKey();
    if(!key){openApiModal();throw new Error("CHAVE_NAO_INFORMADA")}
    const [mmr,matches]=await Promise.all([
      getJSON(`/v2/mmr/${PLAYER.region}/${encodeURIComponent(PLAYER.name)}/${encodeURIComponent(PLAYER.tag)}`,key),
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
      $("notice").textContent=err.message+" Confirme também que a Riot ID é Gavloski#Белла.";
    }
    $("notice").classList.remove("hidden");$("syncLabel").textContent="CONFIGURAÇÃO NECESSÁRIA";
    $("matches").innerHTML='<p class="subtitle">Clique em “Atualizar dados” para tentar novamente.</p>';
  }finally{$("refreshButton").disabled=false}
}
$("refreshButton").addEventListener("click",load);
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