const SUPABASE_URL="https://pyisbtqrwzqxlteibdqp.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_pX1K9Lw_PjWCjS2NiOBYxg_8fDBEgNl";
const FAIRWAY_ADMIN_EMAILS=["admin@fairwayfinds.co.za"];
const FAIRWAY_PAYMENT_LINKS={
featuredListing:"",
sponsoredListing:"",
advertising:"",
};
const GOOGLE_TAG_MANAGER_ID="GTM-MNKDQZVH";
const REMEMBER_SESSION_KEY="fairway_remember_session";
function fairwayPreferredAuthStorage(){
try{
return window.localStorage.getItem(REMEMBER_SESSION_KEY)==="false"?window.sessionStorage:window.localStorage;
}catch(error){
return window.localStorage;
}
}
const fairwayAuthStorage={
getItem(key){
try{
return window.localStorage.getItem(key)||window.sessionStorage.getItem(key);
}catch(error){
return null;
}
},
setItem(key,value){
try{
const storage=fairwayPreferredAuthStorage();
const otherStorage=storage===window.localStorage?window.sessionStorage:window.localStorage;
otherStorage.removeItem(key);
storage.setItem(key,value);
}catch(error){
window.localStorage.setItem(key,value);
}
},
removeItem(key){
try{
window.localStorage.removeItem(key);
window.sessionStorage.removeItem(key);
}catch(error){
window.localStorage.removeItem(key);
}
},
};
window.fairwaySupabaseReady=
Boolean(window.supabase)&&SUPABASE_URL.startsWith("https://")&&SUPABASE_ANON_KEY.length>40;
window.fairwaySupabase=window.fairwaySupabaseReady
?window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{
auth:{
persistSession:true,
autoRefreshToken:true,
detectSessionInUrl:true,
storage:fairwayAuthStorage,
},
})
:null;
window.fairwayAdminEmails=FAIRWAY_ADMIN_EMAILS;
window.fairwayPaymentLinks=FAIRWAY_PAYMENT_LINKS;
window.fairwayGoogleTagManagerId=GOOGLE_TAG_MANAGER_ID;
