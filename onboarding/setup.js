(function(){
  // Mirrors the meal_plans table in schema.sql. m: weekly = resets each week, block = one pool, none = dollars only
  var PLANS = [
    {c:"platinum", n:"Cardinal Platinum", g:0, m:"weekly", s:18,  d:225, x:0,   p:12},
    {c:"premium",  n:"Cardinal Premium",  g:0, m:"weekly", s:12,  d:100, x:0,   p:8},
    {c:"gold",     n:"Cardinal Gold",     g:0, m:"block",  s:200, d:500, x:0,   p:0},
    {c:"silver",   n:"Cardinal Silver",   g:0, m:"block",  s:150, d:450, x:0,   p:0},
    {c:"bronze",   n:"Cardinal Bronze",   g:0, m:"block",  s:100, d:350, x:0,   p:0},
    {c:"grad",     n:"Cardinal Grad",     g:1, m:"block",  s:60,  d:75,  x:0,   p:0},
    {c:"burghy850",n:"Burghy 850",        g:2, m:"none",   s:0,   d:700, x:150, p:0},
    {c:"burghy550",n:"Burghy 550",        g:2, m:"none",   s:0,   d:450, x:100, p:0},
    {c:"burghy275",n:"Burghy 275",        g:2, m:"none",   s:0,   d:225, x:50,  p:0}
  ];
  var GROUPS = ["Undergrad, living on campus","Graduate","Off campus"];
  function $(id){ return document.getElementById(id); }
  function iso(dt){ return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"); }
  function find(code){ return PLANS.filter(function(p){ return p.c===code; })[0]; }

  var sel = $("plan");
  GROUPS.forEach(function(name, gi){
    var og = document.createElement("optgroup"); og.label = name;
    PLANS.filter(function(p){ return p.g===gi; }).forEach(function(p){
      var o = document.createElement("option"); o.value = p.c; o.textContent = p.n; og.appendChild(o);
    });
    sel.appendChild(og);
  });

  function toggle(id, show){ $(id).classList.toggle("hidden", !show); }

  sel.addEventListener("change", function(){
    var p = find(sel.value);
    toggle("info", !!p);
    if(!p) return;
    var bits = [];
    if(p.m==="weekly") bits.push("Unlimited Clinton Dining Hall", p.s+" retail swipes per week (resets weekly)");
    if(p.m==="block")  bits.push(p.s+" swipes for the semester");
    bits.push("$"+p.d+" Dining Dollars");
    if(p.x) bits.push("$"+p.x+" Cardinal Cash");
    if(p.p) bits.push(p.p+" guest passes");
    $("info").textContent = bits.join(" · ");
    toggle("swipeWrap", p.m!=="none");
    toggle("cashWrap", p.x>0);
    toggle("guestWrap", p.p>0);
    $("swipeLabel").textContent = p.m==="weekly" ? "Retail swipes left this week" : "Meal swipes left";
    $("swipes").value = p.s; $("dollars").value = p.d; $("cash").value = p.x; $("guests").value = p.p;
  });

  $("form").addEventListener("submit", function(e){
    e.preventDefault();
    var p = find(sel.value), err = $("err");
    var today = new Date(); today.setHours(0,0,0,0);
    if(!p){ err.textContent = "Choose your meal plan first."; return; }
    var swipes = p.m==="none" ? 0 : Number($("swipes").value);
    var dollars = Number($("dollars").value), cash = p.x>0 ? Number($("cash").value) : 0, guests = p.p>0 ? Number($("guests").value) : 0;
    if([swipes,dollars,cash,guests].some(function(n){ return isNaN(n) || n<0; }) || (p.m!=="none" && $("swipes").value==="") || $("dollars").value===""){
      err.textContent = "Enter a number (0 or more) in each field."; return;
    }
    var end = $("end").value;
    if(!end || new Date(end+"T00:00:00") <= today){ err.textContent = "Pick a last day of the semester that’s after today."; return; }
    err.textContent = "";
    var data = {plan:p.n, code:p.c, mode:p.m, swipes:swipes, dollars:dollars, cash:cash, guests:guests, start:iso(today), end:end};
    try{ localStorage.setItem("swipewise:setup", JSON.stringify(data)); }catch(x){}

    var rows = [["Plan", p.n]];
    if(p.m!=="none") rows.push([p.m==="weekly" ? "Retail swipes this week" : "Meal swipes", String(swipes)]);
    rows.push(["Dining Dollars", "$"+dollars.toFixed(2)]);
    if(p.x>0) rows.push(["Cardinal Cash", "$"+cash.toFixed(2)]);
    if(p.p>0) rows.push(["Guest passes", String(guests)]);
    rows.push(["Semester ends", new Date(end+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})]);
    var dl = $("summary"); dl.innerHTML = "";
    rows.forEach(function(r){
      var dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = r[0]; dd.textContent = r[1]; dl.appendChild(dt); dl.appendChild(dd);
    });
    $("form").classList.add("hidden"); $("done").classList.remove("hidden");
  });

  $("edit").addEventListener("click", function(){ $("done").classList.add("hidden"); $("form").classList.remove("hidden"); });
})();
