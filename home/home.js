(function(){
  // ---- Sample data: replace with a fetch() to your API (reads v_balances + transactions) ----
  var TODAY = new Date(2026, 9, 20);                 // use new Date() when live
  var term  = { name:"Fall 2026", start:new Date(2026,7,24), end:new Date(2026,11,18) };
  var plan  = { name:"Cardinal Silver", swipes:150, dollars:450 };
  var user  = { first:"Alex" };
  var baseUsed = 62, dollarsLeft = 318.40;           // usage before the activity list below
  var venues = ["Clinton Dining Hall","Kent Café","Cardinal Nest","Cardinal Market & Café","Ghost Kitchen","Halal Shack","Jamal’s Chicken","Einstein Bros. Bagels","Chapter One"];
  var activity = [
    {d:"2026-10-20", v:"Cardinal Nest"}, {d:"2026-10-19", v:"Halal Shack"}, {d:"2026-10-19", v:"Clinton Dining Hall"},
    {d:"2026-10-18", v:"Clinton Dining Hall"}, {d:"2026-10-16", v:"Cardinal Nest"}
  ];
  // -------------------------------------------------------------------------------------------

  // If the setup page saved numbers, use those instead of the sample data
  var saved = null; try { saved = JSON.parse(localStorage.getItem("swipewise:setup")); } catch(e) {}
  if (saved) {
    TODAY = new Date(); TODAY.setHours(0,0,0,0);
    var sd = new Date(saved.start+"T00:00:00");
    term = { name:"tracking since "+sd.toLocaleDateString("en-US",{month:"short",day:"numeric"}), start:sd, end:new Date(saved.end+"T00:00:00") };
    plan = { name:saved.plan, swipes:saved.swipes, dollars:saved.dollars };
    user = { first:"" }; baseUsed = 0; dollarsLeft = saved.dollars; activity = [];
    document.getElementById("foot").textContent = "Using the numbers you entered. They’re stored in this browser until the database is connected.";
  }

  var DAY = 864e5;
  function iso(dt){ return dt.getFullYear()+"-"+String(dt.getMonth()+1).padStart(2,"0")+"-"+String(dt.getDate()).padStart(2,"0"); }
  function $(id){ return document.getElementById(id); }
  function fmt(n){ return (Math.round(n*10)/10).toString(); }

  function render(){
    var used = baseUsed + activity.length, left = plan.swipes - used;
    var daysLeft = Math.max(1, Math.round((term.end - TODAY)/DAY));
    var elapsed  = Math.max(1, Math.round((TODAY - term.start)/DAY));
    var avg = used/elapsed, allow = Math.max(left,0)/daysLeft;

    $("hello").textContent = user.first ? "Hi, "+user.first : "Welcome";
    $("planline").textContent = plan.name+" · "+term.name;
    $("left").textContent = Math.max(left,0);
    $("of").textContent = "of "+plan.swipes;
    $("fill").style.width = Math.max(0,left)/Math.max(plan.swipes,1)*100+"%";
    $("allow").textContent = fmt(allow);
    $("days").textContent = daysLeft;
    $("endnote").textContent = "until "+term.end.toLocaleDateString("en-US",{month:"short",day:"numeric"});
    $("dd").textContent = "$"+dollarsLeft.toFixed(2);
    $("ddof").textContent = "of $"+plan.dollars;
    $("ddfill").style.width = dollarsLeft/Math.max(plan.dollars,1)*100+"%";

    var ratio = allow>0 ? avg/allow : 9, pill=$("pill");
    pill.className = "pill"+(ratio<=1?"":ratio<=1.2?" warn":" hot");
    pill.textContent = ratio<=1?"On pace":ratio<=1.2?"Slightly fast":"Running hot";
    var spare = left - avg*daysLeft;
    $("msg").textContent = left<=0 ? "You’re out of swipes. Dining Dollars or Cardinal Cash can cover the rest."
      : spare>=0 ? "At your current pace you’ll finish with about "+Math.round(spare)+" swipes to spare."
      : "At your current pace you’ll run out about "+Math.round(daysLeft-left/avg)+" days before the semester ends.";
    if (saved && activity.length < 3 && left > 0) { pill.className = "pill"; pill.textContent = "Just getting started"; $("msg").textContent = "Log your swipes as you go and this will show how your pace compares."; }
    $("add").disabled = left<=0;

    // week strip (Mon–Sun)
    var mon = new Date(TODAY); mon.setDate(TODAY.getDate()-((TODAY.getDay()+6)%7));
    var wk = $("week"); wk.innerHTML = "";
    "MTWTFSS".split("").forEach(function(l,i){
      var dt = new Date(mon); dt.setDate(mon.getDate()+i);
      var n = activity.filter(function(a){ return a.d===iso(dt); }).length;
      var col = document.createElement("div");
      var lab = document.createElement("div"); lab.className="day"+(iso(dt)===iso(TODAY)?" today":""); lab.textContent=l;
      var dots = document.createElement("div"); dots.className="dots";
      for(var k=0;k<Math.min(n,4);k++){ var s=document.createElement("span"); s.className="dot"; dots.appendChild(s); }
      if(n===0 && dt<=TODAY){ var e=document.createElement("span"); e.className="dot empty"; dots.appendChild(e); }
      col.appendChild(lab); col.appendChild(dots); wk.appendChild(col);
    });

    var ul = $("activity"); ul.innerHTML = "";
    activity.slice(0,5).forEach(function(a){
      var li=document.createElement("li"), l=document.createElement("div"), r=document.createElement("span");
      var dt=new Date(a.d+"T00:00:00"), diff=Math.round((TODAY-dt)/DAY);
      l.textContent=a.v;
      var sm=document.createElement("small"); sm.textContent = diff===0?"Today":diff===1?"Yesterday":dt.toLocaleDateString("en-US",{month:"short",day:"numeric"});
      l.appendChild(sm); r.className="neg"; r.textContent="−1 swipe";
      li.appendChild(l); li.appendChild(r); ul.appendChild(li);
    });
  }

  var sel = $("venue");
  venues.forEach(function(v){ var o=document.createElement("option"); o.textContent=v; sel.appendChild(o); });
  $("add").addEventListener("click", function(){ activity.unshift({d:iso(TODAY), v:sel.value}); render(); });
  render();
})();
