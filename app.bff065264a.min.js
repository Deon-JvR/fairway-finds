const filterButtons=document.querySelectorAll(".filters button");
const listingCards=document.querySelectorAll(".listing-card");
const searchForm=document.querySelector(".search-panel");
const signupForm=document.querySelector(".signup-form");
if(filterButtons.length&&listingCards.length){
filterButtons.forEach((button)=>{
button.addEventListener("click",()=>{
const filter=button.dataset.filter;
filterButtons.forEach((item)=>item.classList.remove("active"));
button.classList.add("active");
listingCards.forEach((card)=>{
const shouldShow=filter==="all"||card.dataset.type===filter;
card.classList.toggle("hidden",!shouldShow);
});
});
});
}
if(searchForm){
searchForm.addEventListener("submit",(event)=>{
event.preventDefault();
window.location.href="/browse";
});
}
if(signupForm){
signupForm.addEventListener("submit",(event)=>{
event.preventDefault();
const emailInput=signupForm.querySelector("input");
const button=signupForm.querySelector("button");
button.textContent="You're on the list";
emailInput.value="";
});
}
