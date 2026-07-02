const confirmTitle=document.querySelector("[data-confirm-title]");
const confirmIntro=document.querySelector("[data-confirm-intro]");
const confirmMessage=document.querySelector("[data-confirm-message]");
const confirmStatus=document.querySelector("[data-confirm-status]");
const confirmAction=document.querySelector("[data-confirm-action]");
function setConfirmState(title,message,status,type="info"){
if(confirmTitle)confirmTitle.textContent=title;
if(confirmIntro)confirmIntro.textContent=message;
if(confirmMessage)confirmMessage.textContent=message;
if(confirmStatus){
confirmStatus.textContent=status||"";
confirmStatus.dataset.type=type;
}
}
function safeNextPath(value){
const fallback="/profile";
if(!value)return fallback;
if(value.startsWith("http")){
try{
const url=new URL(value);
if(url.origin===window.location.origin){
return`${url.pathname}${url.search}${url.hash}`.replace(/^\//,"")||fallback;
}
}catch(error){
return fallback;
}
return fallback;
}
return value.startsWith("/")?value.slice(1):value;
}
async function confirmAccount(){
if(!window.fairwaySupabaseReady||!window.fairwaySupabase){
setConfirmState(
"Supabase is not configured.",
"The verification page cannot connect to Supabase yet.",
"Check the Supabase URL and publishable key.",
"error"
);
return;
}
const params=new URLSearchParams(window.location.search);
const hashParams=new URLSearchParams(window.location.hash.replace(/^#/,""));
const tokenHash=params.get("token_hash")||hashParams.get("token_hash");
const type=params.get("type")||hashParams.get("type")||"signup";
const next=safeNextPath(params.get("next")||hashParams.get("next")||"/profile");
if(!tokenHash){
const{data}=await window.fairwaySupabase.auth.getSession();
if(data?.session){
setConfirmState(
"Your account is already verified.",
"You are signed in and can continue to your profile.",
"Redirecting...",
"success"
);
window.setTimeout(()=>{
window.location.href=next;
},900);
return;
}
setConfirmState(
"Verification link is missing.",
"Open the latest verification email and use the full link.",
"If the link expired, create a new profile or request another verification email.",
"error"
);
if(confirmAction)confirmAction.hidden=false;
return;
}
const{error}=await window.fairwaySupabase.auth.verifyOtp({
token_hash:tokenHash,
type,
});
if(error){
setConfirmState(
"Verification link could not be used.",
"The link may be expired or already used.",
error.message,
"error"
);
if(confirmAction)confirmAction.hidden=false;
return;
}
setConfirmState(
"Email verified.",
"Your email address has been confirmed. Your profile can now be reviewed by Fairway Finds.",
"Redirecting to your profile...",
"success"
);
window.setTimeout(()=>{
window.location.href=next;
},1200);
}
confirmAccount();
