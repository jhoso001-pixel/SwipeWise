(function(){
  var tabLogin = document.getElementById('tab-login');
  var tabSignup = document.getElementById('tab-signup');
  var formLogin = document.getElementById('form-login');
  var formSignup = document.getElementById('form-signup');
  var switchRow = document.getElementById('switch-row');
  var switchBtn = document.getElementById('switch-btn');

  function setMode(mode){
    var isLogin = mode === 'login';
    tabLogin.setAttribute('aria-selected', isLogin ? 'true' : 'false');
    tabSignup.setAttribute('aria-selected', isLogin ? 'false' : 'true');
    formLogin.classList.toggle('active', isLogin);
    formSignup.classList.toggle('active', !isLogin);
    switchRow.innerHTML = '';
    var text = document.createTextNode(isLogin ? 'New here? ' : 'Already have an account? ');
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link-btn';
    btn.id = 'switch-btn';
    btn.textContent = isLogin ? 'Create an account' : 'Log in';
    btn.addEventListener('click', function(){ setMode(isLogin ? 'signup' : 'login'); });
    switchRow.appendChild(text);
    switchRow.appendChild(btn);
    try{ window.localStorage.setItem('swipewise:lastMode', mode); }catch(e){}
  }

  tabLogin.addEventListener('click', function(){ setMode('login'); });
  tabSignup.addEventListener('click', function(){ setMode('signup'); });
  switchBtn.addEventListener('click', function(){ setMode('signup'); });

  document.querySelectorAll('.pw-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var input = document.getElementById(btn.getAttribute('data-target'));
      var showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.setAttribute('aria-pressed', String(!showing));
      btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
    });
  });

  formLogin.addEventListener('submit', function(e){
    e.preventDefault();
    document.getElementById('note-login').classList.add('show');
  });
  formSignup.addEventListener('submit', function(e){
    e.preventDefault();
    document.getElementById('note-signup').classList.add('show');
  });
  document.getElementById('forgot-link').addEventListener('click', function(){
    document.getElementById('note-login').classList.add('show');
  });

  try{
    var last = window.localStorage.getItem('swipewise:lastMode');
    if (last === 'signup') setMode('signup');
  }catch(e){}
})();
