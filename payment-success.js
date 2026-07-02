(function trackSuccessfulPayment(){
const reference=new URLSearchParams(window.location.search).get("ref");
if(!reference)return;
const storageKey=`fairway_payment_success_${reference}`;
try{
if(window.localStorage.getItem(storageKey))return;
window.localStorage.setItem(storageKey,"1");
}catch(error){
}
const isAdvertising=reference.startsWith("FF-AD");
let checkout={};
try{
checkout=JSON.parse(window.localStorage.getItem(`fairway_checkout_${reference}`)||"{}");
}catch(error){
checkout={};
}
window.fairwayTrackOnce?.("payment_success",reference,{
...checkout,
transaction_id:reference,
payment_type:isAdvertising?"advertising":"listing_promotion",
payment_provider:"ikhokha",
currency:checkout.currency||"ZAR",
});
})();
