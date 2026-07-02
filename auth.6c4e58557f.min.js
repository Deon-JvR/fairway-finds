const authStatuses=Array.from(document.querySelectorAll("[data-auth-status]"));
const signupForm=document.querySelector("[data-signup-form]");
const loginForm=document.querySelector("[data-login-form]");
const accountGrid=document.querySelector("[data-account-grid]");
const accountTitle=document.querySelector("[data-account-title]");
const accountIntro=document.querySelector("[data-account-intro]");
const logoutButton=document.querySelector("[data-logout]");
const profileForm=document.querySelector("[data-profile-form]");
const profileEmail=document.querySelector("[data-profile-email]");
const approvalStatus=document.querySelector("[data-approval-status]");
const AUTH_REMEMBER_SESSION_KEY="fairway_remember_session";
function setStatus(message,type="info"){
if(!authStatuses.length)return;
const visibleForm=[signupForm,loginForm,profileForm].find((form)=>form&&!form.hidden);
const status=visibleForm?.querySelector("[data-auth-status]")||authStatuses[0];
authStatuses.forEach((element)=>{
if(element!==status){
element.textContent="";
delete element.dataset.type;
}
});
status.textContent=message;
status.dataset.type=type;
}
function getClient(){
if(!window.fairwaySupabaseReady||!window.fairwaySupabase){
setStatus("Supabase is not configured yet. Add your project URL and anon key in supabase-config.js.","error");
return null;
}
return window.fairwaySupabase;
}
function renderApprovalStatus(profile){
if(!approvalStatus)return;
const status=profile?.verification_status||"pending";
const messages={
pending:"Pending admin approval. You can update your profile, but cannot buy or sell yet.",
approved:"Verified and approved. You can buy and sell on Fairway Finds.",
rejected:"Verification rejected. Contact Fairway Finds support before buying or selling.",
suspended:"Account suspended. Buying and selling are disabled.",
};
approvalStatus.textContent=messages[status]||messages.pending;
approvalStatus.dataset.status=status;
}
function formValue(form,name){
return String(new FormData(form).get(name)||"").trim();
}
function userMetadataValue(user,key){
return user?.user_metadata?.[key]||"";
}
function isAdminEmail(email){
const adminEmails=(window.fairwayAdminEmails||[]).map((adminEmail)=>adminEmail.toLowerCase());
return adminEmails.includes(String(email||"").toLowerCase());
}
function accountLandingPage(email){
return isAdminEmail(email)?"/admin":"/browse";
}
function setRememberPreference(remember){
try{
window.localStorage.setItem(AUTH_REMEMBER_SESSION_KEY,remember?"true":"false");
}catch(error){
}
}
function loadRememberPreference(){
try{
return window.localStorage.getItem(AUTH_REMEMBER_SESSION_KEY)!=="false";
}catch(error){
return true;
}
}
function showAccountMode(mode){
if(!signupForm||!loginForm)return;
const isSignIn=mode==="sign-in";
signupForm.hidden=isSignIn;
loginForm.hidden=!isSignIn;
accountGrid?.setAttribute("data-mode",isSignIn?"sign-in":"create-profile");
if(accountTitle){
accountTitle.textContent=isSignIn?"Sign in to Fairway Finds.":"Create your Fairway Finds profile.";
}
if(accountIntro){
accountIntro.textContent=isSignIn
?"Log in to buy gear, manage listings, and view your Fairway Finds account."
:"Sign up, confirm your email, then complete your profile for admin approval.";
}
authStatuses.forEach((element)=>{
element.textContent="";
delete element.dataset.type;
});
}
function currentAccountMode(){
return window.location.hash==="#sign-in"?"sign-in":"create-profile";
}
function setOptionalField(form,name,value){
if(form[name])form[name].value=value||"";
}
async function loadProfile(){
const supabase=getClient();
if(!supabase||!profileForm)return;
const{data:userResult,error:userError}=await supabase.auth.getUser();
if(userError||!userResult.user){
window.location.href="/account";
return;
}
const user=userResult.user;
profileEmail.textContent=user.email;
const{data,error}=await supabase
.from("profiles")
.select("email, full_name, phone, address_line_1, address_line_2, suburb, city, province, postal_code, location, bio, verification_status, admin_notes")
.eq("id",user.id)
.maybeSingle();
if(error){
setStatus(error.message,"error");
return;
}
if(data){
profileForm.full_name.value=data.full_name||userMetadataValue(user,"full_name");
profileForm.phone.value=data.phone||userMetadataValue(user,"phone");
profileForm.address_line_1.value=data.address_line_1||userMetadataValue(user,"address_line_1");
profileForm.address_line_2.value=data.address_line_2||userMetadataValue(user,"address_line_2");
profileForm.suburb.value=data.suburb||userMetadataValue(user,"suburb");
profileForm.city.value=data.city||userMetadataValue(user,"city");
profileForm.province.value=data.province||userMetadataValue(user,"province");
profileForm.postal_code.value=data.postal_code||userMetadataValue(user,"postal_code");
profileForm.location.value=data.location||"";
profileForm.bio.value=data.bio||"";
renderApprovalStatus(data);
if(data.admin_notes){
setStatus(`Admin note: ${data.admin_notes}`,"info");
}
}else{
profileForm.full_name.value=userMetadataValue(user,"full_name");
profileForm.phone.value=userMetadataValue(user,"phone");
profileForm.address_line_1.value=userMetadataValue(user,"address_line_1");
profileForm.address_line_2.value=userMetadataValue(user,"address_line_2");
profileForm.suburb.value=userMetadataValue(user,"suburb");
profileForm.city.value=userMetadataValue(user,"city");
profileForm.province.value=userMetadataValue(user,"province");
profileForm.postal_code.value=userMetadataValue(user,"postal_code");
renderApprovalStatus({verification_status:"pending"});
}
}
if(signupForm){
showAccountMode(currentAccountMode());
window.addEventListener("hashchange",()=>{
showAccountMode(currentAccountMode());
});
signupForm.addEventListener("submit",async(event)=>{
event.preventDefault();
const supabase=getClient();
if(!supabase)return;
const formData=new FormData(signupForm);
const email=formValue(signupForm,"email");
const password=formData.get("password");
const fullName=formValue(signupForm,"full_name");
const termsAccepted=formData.get("terms_accepted")==="on";
if(!termsAccepted){
setStatus("You must accept the Fairway Finds terms and conditions before creating a profile.","error");
return;
}
const{data:signupData,error}=await supabase.auth.signUp({
email,
password,
options:{
emailRedirectTo:`${window.location.origin}/auth-confirm`,
data:{
full_name:fullName,
phone:formValue(signupForm,"phone"),
address_line_1:formValue(signupForm,"address_line_1"),
suburb:formValue(signupForm,"suburb"),
city:formValue(signupForm,"city"),
province:formValue(signupForm,"province"),
postal_code:formValue(signupForm,"postal_code"),
terms_accepted:true,
terms_accepted_at:new Date().toISOString(),
},
},
});
if(error){
setStatus(error.message,"error");
return;
}
if(signupData?.user&&signupData.user.identities?.length!==0){
window.fairwayTrackOnce?.("user_registered",signupData.user.id,{
method:"email",
province:formValue(signupForm,"province"),
user_type:"buyer_seller",
});
}
setStatus("Account created. Check your email to confirm your signup, then log in.","success");
signupForm.reset();
});
}
if(loginForm){
showAccountMode(currentAccountMode());
if(loginForm.remember_me)loginForm.remember_me.checked=loadRememberPreference();
loginForm.addEventListener("submit",async(event)=>{
event.preventDefault();
const supabase=getClient();
if(!supabase)return;
const formData=new FormData(loginForm);
setRememberPreference(formData.get("remember_me")==="on");
const{error}=await supabase.auth.signInWithPassword({
email:formData.get("email"),
password:formData.get("password"),
});
if(error){
setStatus(error.message,"error");
return;
}
window.fairwayTrackOnce?.("user_login",String(formData.get("email")||"").toLowerCase(),{
method:"email",
user_type:"buyer_seller",
});
window.location.href=accountLandingPage(formData.get("email"));
});
}
if(logoutButton){
logoutButton.addEventListener("click",async()=>{
const supabase=getClient();
if(!supabase)return;
await supabase.auth.signOut();
window.location.href="/account";
});
}
if(profileForm){
loadProfile();
profileForm.addEventListener("submit",async(event)=>{
event.preventDefault();
const supabase=getClient();
if(!supabase)return;
const{data:userResult,error:userError}=await supabase.auth.getUser();
if(userError||!userResult.user){
window.location.href="/account";
return;
}
const profile={
id:userResult.user.id,
email:userResult.user.email,
full_name:formValue(profileForm,"full_name"),
phone:formValue(profileForm,"phone"),
address_line_1:formValue(profileForm,"address_line_1"),
address_line_2:formValue(profileForm,"address_line_2"),
suburb:formValue(profileForm,"suburb"),
city:formValue(profileForm,"city"),
province:formValue(profileForm,"province"),
postal_code:formValue(profileForm,"postal_code"),
location:formValue(profileForm,"location"),
account_type:"buyer_seller",
bio:formValue(profileForm,"bio"),
updated_at:new Date().toISOString(),
};
const{error}=await supabase.from("profiles").upsert(profile);
if(error){
setStatus(error.message,"error");
return;
}
setStatus("Profile saved.","success");
});
}
